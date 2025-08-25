const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Thông tin cơ bản
  maSanPham: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenTiengViet: {
    type: String,
    required: true
  },
  tenTiengAnh: String,
  tenTiengNhat: String,
  moTa: String,
  hsCode: String,
  
  // Phân loại sản phẩm (embedded)
  loaiSanPham: {
    ma: String,
    ten: String
  },
  dongSanPham: {
    ma: String,
    ten: String
  },
  nhanhSanPham: {
    ma: String,
    ten: String
  },
  
  // Xuất xứ
  quocGiaXuatXu: String,
  nhaSanXuat: String,
  
  // Nhà cung cấp (embedded)
  nhaCungCap: {
    ma: String,
    ten: String
  },
  thoiGianGiaoHang: {
    type: Number,
    default: 0
  },
  
  // Giá cả
  tienTe: {
    type: String,
    enum: ['VND', 'USD', 'EUR', 'JPY'],
    default: 'VND'
  },
  chiPhiNgoaiTe: {
    type: Number,
    default: 0
  },
  chiPhiVND: {
    type: Number,
    default: 0
  },
  donGiaTruocThue: {
    type: Number,
    default: 0
  },
  thueSuatGTGT: {
    type: Number,
    default: 0
  },
  donGiaSauThue: {
    type: Number,
    default: 0
  },
  hieuLucBaoGia: {
    tuNgay: Date,
    denNgay: Date
  },
  
  // Thông số kỹ thuật
  hanSuDung: Number,
  soSanPhamMotQuyCach: {
    type: Number,
    default: 1
  },
  thoiHanBaoHanh: Number,
  moq: {
    type: Number,
    default: 1
  },
  
  // Đơn vị tính
  donViTinhChinh: String,
  donViTinhPhu1: String,
  donViTinhPhu2: String,
  
  // Phân loại đặc tính
  phanLoaiHang: {
    type: String,
    default: 'NORMAL'
  },
  laDoiTuongSanXuat: {
    type: Boolean,
    default: false
  },
  laHoaChat: {
    type: Boolean,
    default: false
  },
  laHangVatLy: {
    type: Boolean,
    default: true
  },
  laPhuongTienBaoHo: {
    type: Boolean,
    default: false
  },
  laThietBiSanXuat: {
    type: Boolean,
    default: false
  },
  laThietBiQuanLyNghiemNgat: {
    type: Boolean,
    default: false
  },
  canCER: {
    type: Boolean,
    default: false
  },
  canHopDong: {
    type: Boolean,
    default: false
  },
  laHangVoHinh: {
    type: Boolean,
    default: false
  },
  canIMDS: {
    type: Boolean,
    default: false
  },
  maSoIMDS: String,
  
  // Kế toán
  costCenter: String,
  taiKhoanKeToan: String,
  
  // Metadata
  imageUrl: String,  // ĐÃ THÊM: URL hình ảnh sản phẩm
  trangThaiHoatDong: {
    type: String,
    enum: ['hoatDong', 'ngung'],
    default: 'hoatDong'
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ tenTiengViet: 'text', tenTiengAnh: 'text' });
productSchema.index({ 'nhaCungCap.ma': 1 });
productSchema.index({ 'loaiSanPham.ma': 1, 'dongSanPham.ma': 1 });
productSchema.index({ trangThaiHoatDong: 1 });

// Virtual for full name
productSchema.virtual('tenDayDu').get(function() {
  return `${this.maSanPham} - ${this.tenTiengViet}`;
});

module.exports = mongoose.model('Product', productSchema);
