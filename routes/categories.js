const express = require('express');
const router = express.Router();
const Category = require('../models/category');

// GET all categories
router.get('/', async (req, res) => {
  try {
    const { capDanhMuc, maDanhMucCha } = req.query;
    const filter = {};
    
    if (capDanhMuc) filter.capDanhMuc = capDanhMuc;
    if (maDanhMucCha) filter.maDanhMucCha = maDanhMucCha;
    
    const categories = await Category.find(filter);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET category by id
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ maDanhMuc: req.params.id });
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create category
router.post('/', async (req, res) => {
  try {
    const category = new Category(req.body);
    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update category
router.put('/:id', async (req, res) => {
  try {
    const updatedCategory = await Category.findOneAndUpdate(
      { maDanhMuc: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }
    
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    const deletedCategory = await Category.findOneAndDelete({ 
      maDanhMuc: req.params.id 
    });
    
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }
    
    res.json({ message: 'Đã xóa danh mục' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
