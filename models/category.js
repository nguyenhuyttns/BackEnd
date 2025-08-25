const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  maDanhMuc: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenDanhMuc: {
    type: String,
    required: true
  },
  capDanhMuc: {
    type: String,
    enum: ['loai', 'dong', 'nhanh'],
    required: true
  },
  maDanhMucCha: {
    type: String,
    default: null
  },
  trangThai: {
    type: String,
    enum: ['hoatDong', 'ngung'],
    default: 'hoatDong'
  }
}, {
  timestamps: true
});

// Index để query nhanh theo cấp
categorySchema.index({ capDanhMuc: 1, maDanhMucCha: 1 });

module.exports = mongoose.model('Category', categorySchema);
