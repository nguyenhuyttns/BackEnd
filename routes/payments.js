// routes/payments.js
const express = require('express');
const router = express.Router();
const { Payment } = require('../models/payment');
const { Order } = require('../models/order');
const { User } = require('../models/user');
const momoService = require('../helpers/momo-service');
const mongoose = require('mongoose');
const { sendOrderConfirmationEmail } = require('../helpers/email-service');

/**
 * Tạo yêu cầu thanh toán MoMo cho đơn hàng
 * 
 * @route POST /api/v1/payments/create-momo/:orderId
 * @param {string} orderId - ID của đơn hàng cần thanh toán
 * @param {Object} req.body - Dữ liệu yêu cầu
 * @param {string} req.body.returnUrl - URL chuyển hướng sau khi thanh toán
 * @returns {Object} Thông tin thanh toán và URL thanh toán
 * @description Tạo yêu cầu thanh toán qua MoMo và lưu thông tin giao dịch
 */
router.post('/create-momo/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { returnUrl } = req.body;

        console.log('Creating payment for orderId:', orderId);

        const order = await Order.findById(orderId).populate('user', 'email');
        if (!order) {
            console.error('Order not found:', orderId);
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const existingPayment = await Payment.findOne({ order: orderId, status: 'COMPLETED' });
        if (existingPayment) {
            console.error('Payment already completed for order:', orderId);
            return res.status(400).json({ success: false, message: 'Đơn hàng này đã được thanh toán' });
        }

        const paymentResult = await momoService.createPayment(order, returnUrl);
        console.log('Payment result:', paymentResult);

        if (paymentResult.success) {
            const payment = new Payment({
                order: orderId,
                user: order.user,
                amount: order.totalPrice,
                provider: 'MOMO',
                status: 'PENDING', // Thay đổi thành PENDING để phù hợp với luồng xử lý thông thường
                paymentId: paymentResult.paymentId,
                requestId: paymentResult.requestId,
                payUrl: paymentResult.data.payUrl,
                responseData: paymentResult.data
            });

            await payment.save();
            console.log('Payment created successfully:', payment.id);

            return res.status(200).json({
                success: true,
                message: 'Tạo giao dịch thanh toán thành công',
                paymentUrl: paymentResult.data.payUrl,
                paymentId: payment.id
            });
        } else {
            console.error('Failed to create payment:', paymentResult.data.message);
            return res.status(400).json({
                success: false,
                message: 'Không thể tạo giao dịch thanh toán',
                error: paymentResult.data.message
            });
        }
    } catch (error) {
        console.error('Error creating payment:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo giao dịch thanh toán',
            error: error.message
        });
    }
});

/**
 * Xử lý webhook từ MoMo
 * 
 * @route POST /api/v1/payments/webhook
 * @param {Object} req.body - Dữ liệu IPN từ MoMo
 * @returns {Object} Xác nhận đã xử lý webhook
 * @description Xử lý thông báo thanh toán từ MoMo và cập nhật trạng thái đơn hàng
 */
router.post('/webhook', async (req, res) => {
    try {
        const ipnData = req.body;
        console.log('MoMo IPN Data:', JSON.stringify(ipnData));


        if (!ipnData) {
            console.error('No IPN data received');
            return res.status(400).json({ message: 'No IPN data received' });
        }

        if (!ipnData.orderId || !ipnData.resultCode || !ipnData.transId || !ipnData.signature) {
            console.error('Missing required fields in IPN data');
            return res.status(400).json({ message: 'Missing required fields' });
        }

        console.log('Verifying signature for orderId:', ipnData.orderId);
        const isValidSignature = momoService.verifyIpnSignature(ipnData);
        console.log('Signature verification result:', isValidSignature);

        if (!isValidSignature) {
            console.error('Invalid MoMo signature');
            return res.status(400).json({ message: 'Invalid signature' });
        }

        console.log('Finding payment with paymentId:', ipnData.orderId);
        const payment = await Payment.findOne({ paymentId: ipnData.orderId });

        if (!payment) {
            console.error('Payment not found:', ipnData.orderId);
            return res.status(404).json({ message: 'Payment not found' });
        }

        console.log('Updating payment status from', payment.status, 'to', (ipnData.resultCode === 0 ? 'COMPLETED' : 'FAILED'));
        payment.status = ipnData.resultCode === 0 ? 'COMPLETED' : 'FAILED';
        payment.transId = ipnData.transId;
        payment.responseData = ipnData;
        payment.updatedAt = Date.now();

        await payment.save();
        console.log('Payment updated successfully');

        if (ipnData.resultCode === 0) {
            console.log('Payment successful, updating order status');
            const order = await Order.findById(payment.order);

            if (order) {
                console.log('Updating order status from', order.status, 'to Paid');
                order.status = 'Paid';
                order.paymentStatus = 'PAID';
                await order.save();
                console.log('Order updated successfully');

                const user = await User.findById(payment.user);
                if (user && user.email) {
                    console.log('Sending confirmation email to', user.email);
                    await sendOrderConfirmationEmail(user.email, order);
                    console.log('Confirmation email sent successfully');
                }
            }
        }
        console.log('Webhook processing completed successfully');
        return res.status(200).json({ message: 'Processed' });
    } catch (error) {
        console.error('Error processing MoMo webhook:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * Xử lý thanh toán thủ công
 * 
 * @route POST /api/v1/payments/process-payment
 * @param {Object} req.body - Dữ liệu thanh toán
 * @param {string} req.body.orderId - ID của giao dịch thanh toán
 * @param {string} req.body.resultCode - Mã kết quả (mặc định "0" - thành công)
 * @param {string} req.body.transId - ID giao dịch (mặc định là timestamp hiện tại)
 * @returns {Object} Kết quả xử lý thanh toán
 * @description Xử lý kết quả thanh toán thủ công khi không nhận được webhook
 */
router.post('/process-payment', async (req, res) => {
    try {
        const { orderId, resultCode = "0", transId = Date.now().toString() } = req.body;

        console.log('Processing payment manually:', { orderId, resultCode, transId });

        // Kiểm tra orderId
        if (!orderId) {
            return res.status(400).json({ 
                success: false, 
                message: 'orderId là bắt buộc' 
            });
        }

        console.log('Finding payment with paymentId:', orderId);
        const payment = await Payment.findOne({ paymentId: orderId });

        if (!payment) {
            console.error('Payment not found:', orderId);
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy giao dịch thanh toán' 
            });
        }

        // Cập nhật thông tin giao dịch
        console.log('Updating payment status from', payment.status, 'to', (resultCode === "0" ? 'COMPLETED' : 'FAILED'));
        payment.status = resultCode === "0" ? 'COMPLETED' : 'FAILED';
        payment.transId = transId;
        payment.responseData = req.body;
        payment.updatedAt = Date.now();

        await payment.save();
        console.log('Payment updated successfully');

        // Nếu thanh toán thành công, cập nhật trạng thái đơn hàng
        let order = null;
        if (resultCode === "0") {
            console.log('Payment successful, updating order status');
            order = await Order.findById(payment.order);

            if (order) {
                console.log('Updating order status from', order.status, 'to Paid');
                order.status = 'Paid';
                order.paymentStatus = 'PAID';
                await order.save();
                console.log('Order updated successfully');
            }
        }

        // Trả về phản hồi thành công
        return res.status(200).json({ 
            success: true, 
            message: 'Đã xử lý thanh toán thành công',
            payment: {
                id: payment._id,
                status: payment.status,
                transId: payment.transId,
                updatedAt: payment.updatedAt
            },
            order: order ? {
                id: order._id,
                status: order.status,
                paymentStatus: order.paymentStatus
            } : null
        });
    } catch (error) {
        console.error('Error processing payment manually:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi xử lý thanh toán',
            error: error.message
        });
    }
});


/**
 * Kiểm tra trạng thái thanh toán
 * 
 * @route GET /api/v1/payments/status/:paymentId
 * @param {string} paymentId - ID của giao dịch thanh toán
 * @returns {Object} Thông tin trạng thái thanh toán
 * @description Trả về thông tin chi tiết về trạng thái của một giao dịch thanh toán
 */
router.get('/status/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId)
            .populate('order', 'status totalPrice')
            .populate('user', 'name email');

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch thanh toán' });
        }

        return res.status(200).json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                amount: payment.amount,
                provider: payment.provider,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
                order: payment.order,
                user: payment.user
            }
        });
    } catch (error) {
        console.error('Error checking payment status:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra trạng thái thanh toán',
            error: error.message
        });
    }
});

/**
 * Lấy danh sách tất cả giao dịch thanh toán
 * 
 * @route GET /api/v1/payments
 * @returns {Object} Danh sách các giao dịch thanh toán
 * @description Trả về danh sách tất cả các giao dịch thanh toán (chỉ dành cho admin)
 */
router.get('/', async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('order', 'status totalPrice')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: payments.length,
            payments: payments
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách giao dịch',
            error: error.message
        });
    }
});

module.exports = router;
