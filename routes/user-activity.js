// routes/user-activity.js
const express = require('express');
const router = express.Router();
const { UserActivity } = require('../models/user-activity');
const { Product } = require('../models/product');

// API ghi lại lượt xem sản phẩm
router.post('/view', async (req, res) => {
  try {
    const { userId, productId, viewTime } = req.body;
    
    // Lấy thông tin sản phẩm để biết category
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    // Tìm hoặc tạo bản ghi hoạt động
    let activity = await UserActivity.findOne({ user: userId, product: productId });
    
    if (activity) {
      // Cập nhật nếu đã tồn tại
      activity.viewCount += 1;
      activity.viewTime += viewTime || 0;
      activity.lastInteraction = Date.now();
    } else {
      // Tạo mới nếu chưa tồn tại
      activity = new UserActivity({
        user: userId,
        product: productId,
        category: product.category,
        viewCount: 1,
        viewTime: viewTime || 0
      });
    }
    
    await activity.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API ghi lại thêm vào giỏ hàng
router.post('/cart-add', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    
    // Lấy thông tin sản phẩm để biết category
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    // Tìm hoặc tạo bản ghi hoạt động
    let activity = await UserActivity.findOne({ user: userId, product: productId });
    
    if (activity) {
      // Cập nhật nếu đã tồn tại
      activity.cartAddCount += 1;
      activity.lastInteraction = Date.now();
    } else {
      // Tạo mới nếu chưa tồn tại
      activity = new UserActivity({
        user: userId,
        product: productId,
        category: product.category,
        cartAddCount: 1
      });
    }
    
    await activity.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking cart add:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API ghi lại mua hàng
router.post('/purchase', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    
    // Lấy thông tin sản phẩm để biết category
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    // Tìm hoặc tạo bản ghi hoạt động
    let activity = await UserActivity.findOne({ user: userId, product: productId });
    
    if (activity) {
      // Cập nhật nếu đã tồn tại
      activity.purchaseCount += 1;
      activity.lastInteraction = Date.now();
    } else {
      // Tạo mới nếu chưa tồn tại
      activity = new UserActivity({
        user: userId,
        product: productId,
        category: product.category,
        purchaseCount: 1
      });
    }
    
    await activity.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking purchase:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
