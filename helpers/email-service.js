const nodemailer = require('nodemailer');

// Tạo transporter với Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Hàm gửi email đặt lại mật khẩu
const sendResetPasswordEmail = async (email, resetLink) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Đặt lại mật khẩu cho tài khoản E-shop của bạn',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #6200EA; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">E-shop</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h2>Yêu cầu đặt lại mật khẩu</h2>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản E-shop của bạn.</p>
            <p>Vui lòng nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #6200EA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Đặt lại mật khẩu</a>
            </div>
            <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            <p>Trân trọng,<br>Đội ngũ E-shop</p>
          </div>
        </div>
      `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email đã được gửi:', info.response);
        return { success: true, info };
    } catch (error) {
        console.error('Lỗi khi gửi email:', error);
        throw error;
    }
};

// Function to send order confirmation email
const sendOrderConfirmationEmail = async (email, order) => {
    try {
        // Format order items for email display
        const orderItemsHtml = order.orderItems
            .map(
                (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <div style="display: flex; align-items: center;">
            <img src="${item.product.image}" alt="${item.product.name}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px; border-radius: 4px;">
            <div>
              <p style="margin: 0; font-weight: bold;">${item.product.name}</p>
              <p style="margin: 0; color: #666; font-size: 12px;">Category: ${item.product.category.name}</p>
            </div>
          </div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">$${item.product.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.product.price * item.quantity).toFixed(2)}</td>
      </tr>
    `
            )
            .join('');

        // Format date
        const orderDate = new Date(order.dateOrdered).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Order Confirmation #${order._id.toString().slice(-8)}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #6200EA; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">E-shop</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h2>Order Confirmation</h2>
            <p>Thank you for your order! We've received your order and it's being processed.</p>
            
            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #6200EA;">Order Details</h3>
              <p><strong>Order Number:</strong> #${order._id.toString().slice(-8)}</p>
              <p><strong>Order Date:</strong> ${orderDate}</p>
              <p><strong>Order Status:</strong> <span style="background-color: #FFF9C4; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${order.status}</span></p>
            </div>
            
            <h3 style="color: #6200EA;">Items Ordered</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="padding: 10px; text-align: left;">Product</th>
                  <th style="padding: 10px; text-align: center;">Price</th>
                  <th style="padding: 10px; text-align: center;">Quantity</th>
                  <th style="padding: 10px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderItemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
                  <td style="padding: 10px; text-align: right;">$${order.totalPrice.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Shipping:</td>
                  <td style="padding: 10px; text-align: right;">FREE</td>
                </tr>
                <tr style="background-color: #f9f9f9;">
                  <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold; font-size: 16px;">Total:</td>
                  <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 16px; color: #6200EA;">$${order.totalPrice.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="margin-top: 30px;">
              <h3 style="color: #6200EA;">Shipping Information</h3>
              <p><strong>Address:</strong> ${order.shippingAddress1}${order.shippingAddress2 ? ', ' + order.shippingAddress2 : ''}</p>
              <p><strong>City:</strong> ${order.city}</p>
              <p><strong>Country:</strong> ${order.country}</p>
              <p><strong>ZIP Code:</strong> ${order.zip}</p>
              <p><strong>Phone:</strong> ${order.phone}</p>
            </div>
            
            <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
              <p>If you have any questions about your order, please contact our customer service.</p>
              <p>Thank you for shopping with E-shop!</p>
            </div>
          </div>
        </div>
      `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Order confirmation email sent:', info.response);
        return { success: true, info };
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        throw error;
    }
};

module.exports = { sendResetPasswordEmail, sendOrderConfirmationEmail };
