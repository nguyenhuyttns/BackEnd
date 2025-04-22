// routes/recommendations.js
const express = require('express');
const router = express.Router();
const { generateRecommendations } = require('../utils/kmeans');

// API lấy đề xuất "For Me"
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

    // Lấy userId từ token JWT
    const userId = req.user.userId;
    
    // Số lượng sản phẩm đề xuất
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    // Tạo đề xuất
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
