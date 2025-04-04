const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const crypto = require('crypto'); // Thêm dòng này
const { sendResetPasswordEmail } = require('../helpers/email-service'); // Thêm dòng này

router.get(`/`, async (req, res) => {
    const userList = await User.find().select('-passwordHash');

    if (!userList) {
        res.status(500).json({ success: false });
    }
    res.send(userList);
});

router.get('/:id', async (req, res) => {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) {
        res.status(500).json({
            message: 'The user with the given ID was not found.',
        });
    }
    res.status(200).send(user);
});

router.post('/', async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
    });
    user = await user.save();

    if (!user) return res.status(400).send('the user cannot be created!');

    res.send(user);
});

router.put('/:id', async (req, res) => {
    const userExist = await User.findById(req.params.id);
    let newPassword;
    if (req.body.password) {
        newPassword = bcrypt.hashSync(req.body.password, 10);
    } else {
        newPassword = userExist.passwordHash;
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            email: req.body.email,
            passwordHash: newPassword,
            phone: req.body.phone,
            isAdmin: req.body.isAdmin,
            street: req.body.street,
            apartment: req.body.apartment,
            zip: req.body.zip,
            city: req.body.city,
            country: req.body.country,
        },
        { new: true }
    );

    if (!user) return res.status(400).send('the user cannot be created!');

    res.send(user);
});

router.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    const secret = process.env.secret;
    if (!user) {
        return res.status(400).send('The user not found');
    }

    if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin: user.isAdmin,
            },
            secret,
            { expiresIn: '1d' }
        );

        res.status(200).send({ user: user.email, token: token });
    } else {
        res.status(400).send('password is wrong!');
    }
});

router.post('/register', async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
    });
    user = await user.save();

    if (!user) return res.status(400).send('the user cannot be created!');

    res.send(user);
});

router.delete('/:id', (req, res) => {
    User.findByIdAndDelete(req.params.id)
        .then((user) => {
            if (user) {
                return res
                    .status(200)
                    .json({ success: true, message: 'the user is deleted!' });
            } else {
                return res
                    .status(404)
                    .json({ success: false, message: 'user not found!' });
            }
        })
        .catch((err) => {
            return res.status(500).json({ success: false, error: err });
        });
});

router.get(`/get/count`, async (req, res) => {
    const userCount = await User.countDocuments((count) => count);

    if (!userCount) {
        res.status(500).json({ success: false });
    }
    res.send({
        userCount: userCount,
    });
});

// Route quên mật khẩu
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Kiểm tra email có tồn tại trong hệ thống không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email không tồn tại trong hệ thống' 
      });
    }
    
    // Tạo token đặt lại mật khẩu (có thời hạn 1 giờ)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 giờ
    await user.save();
    
    // Tạo liên kết đặt lại mật khẩu
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    // Gửi email với liên kết
    await sendResetPasswordEmail(user.email, resetLink);
    
    res.status(200).json({ 
      success: true, 
      message: 'Email đặt lại mật khẩu đã được gửi' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Đã xảy ra lỗi khi xử lý yêu cầu', 
      error: error.message 
    });
  }
});


// Route đặt lại mật khẩu (giữ nguyên)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Tìm người dùng bằng token và kiểm tra thời hạn
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token không hợp lệ hoặc đã hết hạn' 
      });
    }
    
    // Cập nhật mật khẩu mới
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    user.passwordHash = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Mật khẩu đã được cập nhật thành công' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Đã xảy ra lỗi khi xử lý yêu cầu', 
      error: error.message 
    });
  }
});

module.exports = router;
