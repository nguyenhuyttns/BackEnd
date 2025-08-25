const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// GET all products với filter và pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      loaiSanPham,
      dongSanPham,
      nhanhSanPham,
      nhaCungCap,
      trangThai = 'hoatDong'
    } = req.query;

    const filter = {};
    
    // Text search
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Filters
    if (loaiSanPham) filter['loaiSanPham.ma'] = loaiSanPham;
    if (dongSanPham) filter['dongSanPham.ma'] = dongSanPham;
    if (nhanhSanPham) filter['nhanhSanPham.ma'] = nhanhSanPham;
    if (nhaCungCap) filter['nhaCungCap.ma'] = nhaCungCap;
    if (trangThai) filter.trangThaiHoatDong = trangThai;

    const products = await Product
      .find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Product.countDocuments(filter);

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET product by maSanPham
router.get('/:maSanPham', async (req, res) => {
  try {
    const product = await Product.findOne({ 
      maSanPham: req.params.maSanPham 
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create product
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update product
router.put('/:maSanPham', async (req, res) => {
  try {
    const updatedProduct = await Product.findOneAndUpdate(
      { maSanPham: req.params.maSanPham },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE product
router.delete('/:maSanPham', async (req, res) => {
  try {
    const deletedProduct = await Product.findOneAndDelete({ 
      maSanPham: req.params.maSanPham 
    });
    
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    
    res.json({ message: 'Đã xóa sản phẩm' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
