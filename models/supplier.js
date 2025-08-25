const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  maNhaCungCap: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenNhaCungCap: {
    type: String,
    required: true
  },
  diaChi: String,
  soDienThoai: String,
  email: String,
  trangThai: {
    type: String,
    enum: ['hoatDong', 'ngung'],
    default: 'hoatDong'
  }
}, {
  timestamps: true
});

// Text search cho tên
supplierSchema.index({ tenNhaCungCap: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
