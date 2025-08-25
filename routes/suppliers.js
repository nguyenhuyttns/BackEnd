const express = require('express');
const router = express.Router();
const Supplier = require('../models/supplier');

// GET all suppliers
router.get('/', async (req, res) => {
    try {
        const suppliers = await Supplier.find({ trangThai: 'hoatDong' });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET supplier by maNhaCungCap
router.get('/:maNhaCungCap', async (req, res) => {
    try {
        const supplier = await Supplier.findOne({ 
            maNhaCungCap: req.params.maNhaCungCap 
        });
        
        if (!supplier) {
            return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
        }
        
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST create supplier
router.post('/', async (req, res) => {
    try {
        const supplier = new Supplier(req.body);
        const savedSupplier = await supplier.save();
        res.status(201).json(savedSupplier);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update supplier
router.put('/:maNhaCungCap', async (req, res) => {
    try {
        const updatedSupplier = await Supplier.findOneAndUpdate(
            { maNhaCungCap: req.params.maNhaCungCap },
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!updatedSupplier) {
            return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
        }
        
        res.json(updatedSupplier);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE supplier
router.delete('/:maNhaCungCap', async (req, res) => {
    try {
        const deletedSupplier = await Supplier.findOneAndDelete({ 
            maNhaCungCap: req.params.maNhaCungCap 
        });
        
        if (!deletedSupplier) {
            return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
        }
        
        res.json({ message: 'Đã xóa nhà cung cấp' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
