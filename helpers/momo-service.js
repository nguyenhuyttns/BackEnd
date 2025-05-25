// helpers/momo-service.js
const crypto = require('crypto');
const axios = require('axios');

/**
 * Lớp dịch vụ tích hợp thanh toán MoMo
 * 
 * @class MomoService
 * @description Cung cấp các phương thức để tạo và xác minh thanh toán qua MoMo
 */
class MomoService {
    /**
     * Khởi tạo đối tượng MomoService với các thông tin cấu hình
     * 
     * @constructor
     * @description Thiết lập các thông số cấu hình từ biến môi trường hoặc giá trị mặc định
     */
    constructor() {
        this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
        this.accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
        this.secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
        this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
        this.redirectUrl = process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment/callback';
        this.ipnUrl = process.env.MOMO_IPN_URL || 'http://localhost:3000/api/v1/payments/webhook';
    }

    /**
     * Tạo yêu cầu thanh toán MoMo
     * 
     * @async
     * @function createPayment
     * @param {Object} order - Đối tượng đơn hàng cần thanh toán
     * @param {string} [returnUrl] - URL chuyển hướng sau khi thanh toán (tùy chọn)
     * @returns {Promise<Object>} Kết quả yêu cầu thanh toán từ MoMo
     * @throws {Error} Lỗi khi tạo yêu cầu thanh toán
     * @description Tạo yêu cầu thanh toán đến MoMo và trả về kết quả với URL thanh toán
     */
    async createPayment(order, returnUrl) {
        try {
            let redirectUrl = returnUrl || this.redirectUrl;

            if (!redirectUrl) {
                redirectUrl = 'http://localhost:3000/payment/callback';
            }
            const orderInfo = `Thanh toán đơn hàng #${order._id.toString().slice(-8)}`;
            const amount = order.totalPrice.toString();
            const orderId = `${this.partnerCode}_${Date.now()}_${order._id.toString().slice(-8)}`;
            const requestId = orderId;
            const extraData = '';
            const requestType = "captureWallet";

            if (redirectUrl.indexOf('?') === -1) {
                redirectUrl += '?orderId=' + orderId;
            } else {
                redirectUrl += '&orderId=' + orderId;
            }
            
            console.log('Redirect URL with orderId:', redirectUrl);

            const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
            const signature = crypto.createHmac('sha256', this.secretKey)
                .update(rawSignature)
                .digest('hex');

            const requestBody = {
                partnerCode: this.partnerCode,
                partnerName: "E-shop",
                storeId: "E-shopStore",
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: redirectUrl,
                ipnUrl: this.ipnUrl,
                lang: "vi",
                requestType: requestType,
                autoCapture: true,
                extraData: extraData,
                signature: signature
            };

            console.log('Sending payment request to MoMo:', {
                endpoint: this.endpoint,
                orderId: orderId,
                amount: amount,
                redirectUrl: redirectUrl
            });

            const response = await axios.post(this.endpoint, requestBody);
            
            console.log('MoMo response:', response.data);
            
            if (response.data.resultCode !== 0) {
                console.error('MoMo error:', response.data.message);
            }

            return {
                success: response.data.resultCode === 0,
                data: response.data,
                paymentId: orderId,
                requestId: requestId
            };
        } catch (error) {
            console.error('Error creating MoMo payment:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Xác minh chữ ký của thông báo IPN từ MoMo
     * 
     * @function verifyIpnSignature
     * @param {Object} data - Dữ liệu IPN nhận được từ MoMo
     * @returns {boolean} Kết quả xác minh (true nếu chữ ký hợp lệ)
     * @description Kiểm tra tính xác thực của thông báo thanh toán từ MoMo thông qua chữ ký số
     */
    verifyIpnSignature(data) {
        try {
            if (!data || !data.accessKey || !data.amount || !data.extraData || !data.message || 
                !data.orderId || !data.orderInfo || !data.orderType || !data.partnerCode || 
                !data.payType || !data.requestId || !data.responseTime || !data.resultCode || 
                !data.transId || !data.signature) {
                console.log('Missing fields for signature verification:', data);
                return false;
            }

            console.log('IPN Data received:', JSON.stringify(data, null, 2));

            const rawSignature = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;

            console.log('Raw signature string:', rawSignature);

            const signature = crypto.createHmac('sha256', this.secretKey)
                .update(rawSignature)
                .digest('hex');

            console.log('Calculated signature:', signature);
            console.log('Received signature:', data.signature);
            console.log('Signature match:', signature === data.signature);

            return signature === data.signature;
        } catch (error) {
            console.error('Error verifying IPN signature:', error);
            return false;
        }
    }
}

module.exports = new MomoService();