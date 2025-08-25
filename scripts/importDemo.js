const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import models
const Category = require('../models/category');
const Supplier = require('../models/supplier');
const Product = require('../models/product');

// Connect to MongoDB
mongoose.connect(process.env.CONNECTION_STRING)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ Connection error:', err));

async function importDemo(filePath) {
    try {
        console.log('📂 Reading Excel file...');
        
        // Đọc file Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`📊 Found ${data.length} rows\n`);

        // Tạo Sets để track unique values
        const categoriesSet = new Set();
        const suppliersSet = new Set();

        // 1. COLLECT UNIQUE CATEGORIES & SUPPLIERS
        console.log('🔍 Analyzing data...');
        
        for (const row of data) {
            // Collect categories
            if (row.loaiSanPham_ma && row.loaiSanPham_ten) {
                categoriesSet.add(JSON.stringify({
                    maDanhMuc: row.loaiSanPham_ma,
                    tenDanhMuc: row.loaiSanPham_ten,
                    capDanhMuc: 'loai',
                    maDanhMucCha: null
                }));
            }
            
            if (row.dongSanPham_ma && row.dongSanPham_ten) {
                categoriesSet.add(JSON.stringify({
                    maDanhMuc: row.dongSanPham_ma,
                    tenDanhMuc: row.dongSanPham_ten,
                    capDanhMuc: 'dong',
                    maDanhMucCha: row.loaiSanPham_ma
                }));
            }
            
            if (row.nhanhSanPham_ma && row.nhanhSanPham_ten) {
                categoriesSet.add(JSON.stringify({
                    maDanhMuc: row.nhanhSanPham_ma,
                    tenDanhMuc: row.nhanhSanPham_ten,
                    capDanhMuc: 'nhanh',
                    maDanhMucCha: row.dongSanPham_ma
                }));
            }
            
            // Collect suppliers
            if (row.nhaCungCap_ma && row.nhaCungCap_ten) {
                suppliersSet.add(JSON.stringify({
                    maNhaCungCap: row.nhaCungCap_ma,
                    tenNhaCungCap: row.nhaCungCap_ten
                }));
            }
        }

        // 2. IMPORT CATEGORIES
        console.log('\n📁 Importing Categories...');
        let categoryCount = 0;
        
        for (const catStr of categoriesSet) {
            const category = JSON.parse(catStr);
            try {
                await Category.findOneAndUpdate(
                    { maDanhMuc: category.maDanhMuc },
                    { 
                        ...category,
                        trangThai: 'hoatDong'
                    },
                    { upsert: true, new: true }
                );
                categoryCount++;
                console.log(`  ✅ Category: ${category.maDanhMuc} - ${category.tenDanhMuc}`);
            } catch (err) {
                console.error(`  ❌ Error category: ${err.message}`);
            }
        }
        console.log(`Total categories: ${categoryCount}`);

        // 3. IMPORT SUPPLIERS
        console.log('\n🏢 Importing Suppliers...');
        let supplierCount = 0;
        
        for (const supStr of suppliersSet) {
            const supplier = JSON.parse(supStr);
            try {
                await Supplier.findOneAndUpdate(
                    { maNhaCungCap: supplier.maNhaCungCap },
                    { 
                        ...supplier,
                        trangThai: 'hoatDong'
                    },
                    { upsert: true, new: true }
                );
                supplierCount++;
                console.log(`  ✅ Supplier: ${supplier.maNhaCungCap} - ${supplier.tenNhaCungCap}`);
            } catch (err) {
                console.error(`  ❌ Error supplier: ${err.message}`);
            }
        }
        console.log(`Total suppliers: ${supplierCount}`);

        // 4. IMPORT PRODUCTS
        console.log('\n📦 Importing Products...');
        let productCount = 0;
        let errorCount = 0;
        
        for (const row of data) {
            try {
                // Parse dates
                let hieuLucBaoGia = null;
                if (row.hieuLucBaoGia_tuNgay && row.hieuLucBaoGia_denNgay) {
                    hieuLucBaoGia = {
                        tuNgay: new Date(row.hieuLucBaoGia_tuNgay),
                        denNgay: new Date(row.hieuLucBaoGia_denNgay)
                    };
                }
                
                // Convert Excel boolean strings to actual booleans
                const convertBoolean = (value) => {
                    if (typeof value === 'boolean') return value;
                    if (typeof value === 'string') {
                        return value.toUpperCase() === 'TRUE' || value === 'Có';
                    }
                    return false;
                };
                
                const product = {
                    // Thông tin cơ bản
                    maSanPham: row.maSanPham,
                    tenTiengViet: row.tenTiengViet || '',
                    tenTiengAnh: row.tenTiengAnh || '',
                    tenTiengNhat: row.tenTiengNhat || '',
                    moTa: row.moTa || '',
                    hsCode: row.hsCode || '',
                    
                    // Phân loại
                    loaiSanPham: row.loaiSanPham_ma ? {
                        ma: row.loaiSanPham_ma,
                        ten: row.loaiSanPham_ten
                    } : null,
                    dongSanPham: row.dongSanPham_ma ? {
                        ma: row.dongSanPham_ma,
                        ten: row.dongSanPham_ten
                    } : null,
                    nhanhSanPham: row.nhanhSanPham_ma ? {
                        ma: row.nhanhSanPham_ma,
                        ten: row.nhanhSanPham_ten
                    } : null,
                    
                    // Xuất xứ
                    quocGiaXuatXu: row.quocGiaXuatXu || '',
                    nhaSanXuat: row.nhaSanXuat || '',
                    
                    // Nhà cung cấp
                    nhaCungCap: row.nhaCungCap_ma ? {
                        ma: row.nhaCungCap_ma,
                        ten: row.nhaCungCap_ten
                    } : null,
                    thoiGianGiaoHang: parseInt(row.thoiGianGiaoHang) || 0,
                    
                    // Giá cả
                    tienTe: row.tienTe || 'VND',
                    chiPhiNgoaiTe: parseFloat(row.chiPhiNgoaiTe) || 0,
                    chiPhiVND: parseFloat(row.chiPhiVND) || 0,
                    donGiaTruocThue: parseFloat(row.donGiaTruocThue) || 0,
                    thueSuatGTGT: parseFloat(row.thueSuatGTGT) || 0,
                    donGiaSauThue: parseFloat(row.donGiaSauThue) || 0,
                    hieuLucBaoGia: hieuLucBaoGia,
                    
                    // Thông số kỹ thuật
                    hanSuDung: parseInt(row.hanSuDung) || null,
                    soSanPhamMotQuyCach: parseInt(row.soSanPhamMotQuyCach) || 1,
                    thoiHanBaoHanh: parseInt(row.thoiHanBaoHanh) || null,
                    moq: parseInt(row.moq) || 1,
                    
                    // Đơn vị tính
                    donViTinhChinh: row.donViTinhChinh || '',
                    donViTinhPhu1: row.donViTinhPhu1 || '',
                    donViTinhPhu2: row.donViTinhPhu2 || '',
                    
                    // Phân loại đặc tính
                    phanLoaiHang: row.phanLoaiHang || 'NORMAL',
                    laDoiTuongSanXuat: convertBoolean(row.laDoiTuongSanXuat),
                    laHoaChat: convertBoolean(row.laHoaChat),
                    laHangVatLy: convertBoolean(row.laHangVatLy),
                    laPhuongTienBaoHo: convertBoolean(row.laPhuongTienBaoHo),
                    laThietBiSanXuat: convertBoolean(row.laThietBiSanXuat),
                    laThietBiQuanLyNghiemNgat: convertBoolean(row.laThietBiQuanLyNghiemNgat),
                    canCER: convertBoolean(row.canCER),
                    canHopDong: convertBoolean(row.canHopDong),
                    laHangVoHinh: convertBoolean(row.laHangVoHinh),
                    canIMDS: convertBoolean(row.canIMDS),
                    maSoIMDS: row.maSoIMDS || '',
                    
                    // Kế toán
                    costCenter: row.costCenter || '',
                    taiKhoanKeToan: row.taiKhoanKeToan || '',
                    
                    // Hình ảnh - ĐÃ THÊM
                    imageUrl: row.imageUrl || '',
                    
                    // Trạng thái
                    trangThaiHoatDong: row.trangThaiHoatDong || 'hoatDong'
                };
                
                await Product.findOneAndUpdate(
                    { maSanPham: product.maSanPham },
                    product,
                    { upsert: true, new: true }
                );
                
                productCount++;
                console.log(`  ✅ Product: ${product.maSanPham} - ${product.tenTiengViet}`);
                
            } catch (err) {
                errorCount++;
                console.error(`  ❌ Error product ${row.maSanPham}: ${err.message}`);
            }
        }
        
        console.log(`\nTotal products: ${productCount}`);
        if (errorCount > 0) {
            console.log(`Failed: ${errorCount}`);
        }
        
        console.log('\n🎉 IMPORT COMPLETED!');
        console.log('📊 Summary:');
        console.log(`  ✅ Categories: ${categoryCount}`);
        console.log(`  ✅ Suppliers: ${supplierCount}`);
        console.log(`  ✅ Products: ${productCount}`);
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        setTimeout(() => {
            mongoose.connection.close();
            console.log('\n🔌 Disconnected from MongoDB');
        }, 2000);
    }
}

// Run import
const filePath = process.argv[2] || './data/import.xlsx';
console.log('🚀 Starting Demo Import...');
console.log(`📄 File: ${filePath}\n`);

importDemo(filePath);
