// models/user-activity.js
const mongoose = require('mongoose');

const userActivitySchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  viewTime: {
    type: Number,
    default: 0
  },
  cartAddCount: {
    type: Number,
    default: 0
  },
  purchaseCount: {
    type: Number,
    default: 0
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  }
});

exports.UserActivity = mongoose.model('UserActivity', userActivitySchema);
