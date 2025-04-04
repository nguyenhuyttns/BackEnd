const nodemailer = require('nodemailer');

// Tạo transporter với Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
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

module.exports = { sendResetPasswordEmail };
