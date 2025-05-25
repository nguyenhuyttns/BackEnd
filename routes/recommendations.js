// routes/recommendations.js
const express = require('express');
const router = express.Router();
const { generateRecommendations } = require('../utils/kmeans');

/**
 * Lấy đề xuất sản phẩm cá nhân hóa "For Me"
 * 
 * @route GET /api/v1/recommendations/for-me
 * @query {number} limit - Số lượng sản phẩm đề xuất cần trả về (mặc định: 10)
 * @returns {Object} Danh sách sản phẩm được đề xuất
 * @description Tạo đề xuất sản phẩm cá nhân hóa dựa trên hành vi người dùng và thuật toán K-means
 */
router.get('/for-me', async (req, res) => {
  try {
    // Kiểm tra xem có token JWT không
    if (!req.user) {
      // Trả về một danh sách trống hoặc sản phẩm phổ biến nếu không có token
      return res.status(200).json({
        success: true,
        message: 'Authentication required for personalized recommendations',
        products: []
      });
    }

    const userId = req.user.userId;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const recommendations = await generateRecommendations(userId, limit);
    
    res.status(200).json({
      success: true,
      count: recommendations.length,
      products: recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
});

module.exports = router;
