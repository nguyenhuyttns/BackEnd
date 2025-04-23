// test-momo-webhook.js
const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Kết nối database
mongoose.connect(process.env.CONNECTION_STRING, {})
  .then(() => console.log('Database connected successfully'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Import model Payment
const { Payment } = require('./models/payment');

async function testWebhook(paymentId) {
  try {
    // Tìm payment trong database
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      console.error(`Payment với ID ${paymentId} không tồn tại`);
      process.exit(1);
    }

    console.log('Thông tin payment:', {
      id: payment._id,
      paymentId: payment.paymentId,
      requestId: payment.requestId,
      amount: payment.amount,
      status: payment.status
    });

    // Tạo dữ liệu webhook
    const webhookData = {
      partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
      accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
      requestId: payment.requestId,
      orderId: payment.paymentId,
      amount: payment.amount.toString(),
      orderInfo: `Thanh toán đơn hàng #${payment.order.toString().slice(-8)}`,
      orderType: "momo_wallet",
      transId: Date.now().toString(),
      resultCode: "0",
      message: "Thành công.",
      payType: "qr",
      responseTime: Date.now().toString(),
      extraData: ""
    };

    // Tạo chữ ký
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const rawSignature = `accessKey=${webhookData.accessKey}&amount=${webhookData.amount}&extraData=${webhookData.extraData}&message=${webhookData.message}&orderId=${webhookData.orderId}&orderInfo=${webhookData.orderInfo}&orderType=${webhookData.orderType}&partnerCode=${webhookData.partnerCode}&payType=${webhookData.payType}&requestId=${webhookData.requestId}&responseTime=${webhookData.responseTime}&resultCode=${webhookData.resultCode}&transId=${webhookData.transId}`;
    
    const signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');
    
    webhookData.signature = signature;

    console.log('\nDữ liệu webhook đã tạo:');
    console.log(JSON.stringify(webhookData, null, 2));

    // Gửi webhook
    const webhookUrl = 'http://localhost:3000/api/v1/payments/webhook';
    console.log(`\nĐang gửi webhook đến: ${webhookUrl}`);
    
    const response = await axios.post(webhookUrl, webhookData);
    
    console.log('\nKết quả từ server:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);

    console.log('\nTest webhook hoàn tất!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi test webhook:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Lấy payment ID từ tham số dòng lệnh
const paymentId = process.argv[2];
if (!paymentId) {
  console.error('Vui lòng cung cấp payment ID. Ví dụ: node test-momo-webhook.js 680906ea6c37e4c4ec2a328a');
  process.exit(1);
}

// Chạy test
testWebhook(paymentId);
