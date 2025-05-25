const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();
const { Product } = require('../models/product');

/**
 * Lấy danh sách tất cả các danh mục
 * 
 * @route GET /api/v1/categories
 * @returns {Array} Danh sách các danh mục
 * @description Trả về tất cả các danh mục trong hệ thống
 */
router.get(`/`, async (req, res) => {
    const categoryList = await Category.find();

    if (!categoryList) {
        res.status(500).json({ success: false });
    }
    res.send(categoryList);
});

/**
 * Lấy thông tin một danh mục theo ID
 * 
 * @route GET /api/v1/categories/:id
 * @param {string} id - ID của danh mục cần lấy
 * @returns {Object} Thông tin danh mục
 * @description Trả về thông tin chi tiết của một danh mục dựa theo ID
 */
router.get('/:id', async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        res.status(500).json({
            message: 'The category with the given ID was not found.',
        });
    }
    res.status(200).send(category);
});

/**
 * Tạo danh mục mới
 * 
 * @route POST /api/v1/categories
 * @param {Object} req.body - Dữ liệu danh mục cần tạo
 * @param {string} req.body.name - Tên danh mục
 * @param {string} req.body.icon - Icon của danh mục
 * @param {string} req.body.color - Màu sắc của danh mục
 * @returns {Object} Danh mục đã được tạo
 * @description Tạo một danh mục mới với thông tin được cung cấp
 */
router.post('/', async (req, res) => {
    let category = new Category({
        name: req.body.name,
        icon: req.body.icon,
        color: req.body.color,
    });
    category = await category.save();

    if (!category)
        return res.status(400).send('the category cannot be created!');

    res.send(category);
});

/**
 * Cập nhật thông tin danh mục
 * 
 * @route PUT /api/v1/categories/:id
 * @param {string} id - ID của danh mục cần cập nhật
 * @param {Object} req.body - Dữ liệu danh mục cần cập nhật
 * @param {string} req.body.name - Tên danh mục
 * @param {string} req.body.icon - Icon của danh mục
 * @param {string} req.body.color - Màu sắc của danh mục
 * @returns {Object} Danh mục đã được cập nhật
 * @description Cập nhật thông tin của một danh mục dựa theo ID
 */
router.put('/:id',async (req, res)=> {
    const category = await Category.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            icon: req.body.icon || category.icon,
            color: req.body.color,
        },
        { new: true}
    )

    if(!category)
    return res.status(400).send('the category cannot be created!')

    res.send(category);
})

// /**
//  * Xóa một danh mục
//  * 
//  * @route DELETE /api/v1/categories/:id
//  * @param {string} id - ID của danh mục cần xóa
//  * @returns {Object} Thông báo kết quả xóa
//  * @description Xóa một danh mục dựa theo ID
//  */
// router.delete('/:id', async (req, res) => {
//     try {
//         const category = await Category.findByIdAndDelete(req.params.id);

//         if (category) {
//             return res
//                 .status(200)
//                 .json({ success: true, message: 'The category is deleted!' });
//         } else {
//             return res
//                 .status(404)
//                 .json({ success: false, message: 'Category not found!' });
//         }
//     } catch (err) {
//         return res.status(500).json({ success: false, error: err });
//     }
// });

/**
 * Xóa một danh mục
 * 
 * @route DELETE /api/v1/categories/:id
 * @param {string} id - ID của danh mục cần xóa
 * @returns {Object} Thông báo kết quả xóa
 * @description Xóa một danh mục dựa theo ID, nhưng chỉ khi không còn sản phẩm nào thuộc danh mục đó
 */
router.delete('/:id', async (req, res) => {
    try {
        // Kiểm tra xem có sản phẩm nào thuộc danh mục này không
        const productsInCategory = await Product.find({ category: req.params.id });
        
        if (productsInCategory.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category because it contains products. Remove all products in this category first.'
            });
        }
        
        const category = await Category.findByIdAndDelete(req.params.id);

        if (category) {
            return res
                .status(200)
                .json({ success: true, message: 'The category is deleted!' });
        } else {
            return res
                .status(404)
                .json({ success: false, message: 'Category not found!' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err });
    }
});

module.exports = router;
