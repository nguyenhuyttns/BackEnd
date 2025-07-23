const { Product } = require('../models/product');
const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios')

/**
 * Tạo số ngẫu nhiên trong khoảng
 * 
 * @function getRandomNumber
 * @param {number} min - Giá trị tối thiểu
 * @param {number} max - Giá trị tối đa
 * @returns {number} Số ngẫu nhiên trong khoảng từ min đến max
 * @description Tạo một số nguyên ngẫu nhiên trong khoảng từ min đến max
 */
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Định nghĩa các loại file hình ảnh được chấp nhận
 * 
 * @constant FILE_TYPE_MAP
 * @type {Object}
 * @description Ánh xạ MIME type sang phần mở rộng tệp tin
 */
const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
};

/**
 * Cấu hình lưu trữ cho multer
 * 
 * @constant storage
 * @type {Object}
 * @description Cấu hình nơi lưu trữ và cách đặt tên file khi upload
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if (isValid) {
            uploadError = null;
        }
        cb(uploadError, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    },
});

/**
 * Cấu hình multer để upload file
 * 
 * @constant uploadOptions
 * @type {Object}
 * @description Middleware multer để xử lý upload file
 */
const uploadOptions = multer({ storage: storage });

/**
 * Lấy danh sách tất cả sản phẩm hoặc lọc theo danh mục
 * 
 * @route GET /api/v1/products
 * @query {string} categories - ID danh mục để lọc, phân cách bởi dấu phẩy
 * @returns {Array} Danh sách sản phẩm
 * @description Trả về danh sách tất cả sản phẩm hoặc lọc theo danh mục
 */
router.get(`/`, async (req, res) => {
    //http://localhost:3000/api/v1/products?categories=67dc44aa1c5d49e3e6033647 (find by category)
    let filter = {};
    if (req.query.categories) {
        filter = { category: req.query.categories.split(',') };
    }

    const productList = await Product.find(filter).populate('category');

    if (!productList) {
        res.status(500).json({ success: false });
    }
    res.send(productList);
});

/**
 * Lấy thông tin chi tiết một sản phẩm theo ID
 * 
 * @route GET /api/v1/products/:id
 * @param {string} id - ID của sản phẩm
 * @returns {Object} Thông tin chi tiết sản phẩm
 * @description Trả về thông tin chi tiết của một sản phẩm dựa trên ID
 */
router.get(`/:id`, async (req, res) => {
    //http://localhost:3000/api/v1/products/67dcea5740cea065c85174aa (find by id)
    const product = await Product.findById(req.params.id).populate('category');

    if (!product) {
        res.status(500).json({ success: false });
    }
    res.send(product);
});


/**
 * Lấy số lượng sản phẩm trong hệ thống
 * 
 * @route GET /api/v1/products/get/count
 * @returns {Object} Số lượng sản phẩm
 * @description Trả về tổng số sản phẩm trong hệ thống
 */
router.get(`/get/count`, async (req, res) => {
    //http://localhost:3000/api/v1/products/get/count (cout number of product)
    try {
        const productCount = await Product.countDocuments();

        res.status(200).send({
            productCount: productCount,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Lấy danh sách sản phẩm nổi bật
 * 
 * @route GET /api/v1/products/get/featured/:count
 * @param {number} count - Số lượng sản phẩm cần lấy
 * @returns {Array} Danh sách sản phẩm nổi bật
 * @description Trả về danh sách sản phẩm được đánh dấu là nổi bật
 */
router.get(`/get/featured/:count`, async (req, res) => {
    //http://localhost:3000/api/v1/products/get/featured/5 (display the product is displayed)
    const count = req.params.count ? req.params.count : 0;
    const products = await Product.find({ isFeatured: true }).limit(+count);

    if (!products) {
        res.status(500).json({ success: false });
    }
    res.send(products);
});

/**
 * Chuyển đổi thông tin sản phẩm cho phản hồi
 * 
 * @function mapProductForResponse
 * @param {Object} product - Đối tượng sản phẩm
 * @returns {Object} Thông tin sản phẩm đã được chuyển đổi
 * @description Chuyển đổi đối tượng sản phẩm sang định dạng phù hợp cho phản hồi API
 */
function mapProductForResponse(product) {
    return {
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        category: product.category ? product.category.name : 'Uncategorized',
        countInStock: product.countInStock,
        numReviews: product.numReviews,
        inventoryValue: product.price * product.countInStock
    };
}

/**
 * Lấy thống kê và phân tích sản phẩm
 * 
 * @route GET /api/v1/products/statistics/insights
 * @returns {Object} Thông tin thống kê sản phẩm
 * @description Trả về các thống kê và phân tích về sản phẩm trong hệ thống
 */
router.get('/statistics/insights', async (req, res) => {
    try {
        const products = await Product.find().populate('category');
        
        if (!products || products.length === 0) {
            return res.status(404).json({ success: false, message: 'No products found' });
        }
        
        const bestSellingProducts = [...products].sort((a, b) => b.numReviews - a.numReviews);
        
        const mostStockedProducts = [...products].sort((a, b) => b.countInStock - a.countInStock);
        
        const lowStockProducts = [...products].sort((a, b) => a.countInStock - b.countInStock);
        
        const highValueInventory = [...products].sort((a, b) => 
            (b.price * b.countInStock) - (a.price * a.countInStock)
        );
        
        const totalInventoryValue = products.reduce((sum, product) => 
            sum + (product.price * product.countInStock), 0
        );
        
        const totalSold = products.reduce((sum, product) => sum + product.numReviews, 0);
        
        const categoryAnalysis = {};
        products.forEach(product => {
            const categoryName = product.category ? product.category.name : 'Uncategorized';
            
            if (!categoryAnalysis[categoryName]) {
                categoryAnalysis[categoryName] = {
                    count: 0,
                    totalStock: 0,
                    totalSold: 0,
                    totalValue: 0
                };
            }
            
            categoryAnalysis[categoryName].count += 1;
            categoryAnalysis[categoryName].totalStock += product.countInStock;
            categoryAnalysis[categoryName].totalSold += product.numReviews;
            categoryAnalysis[categoryName].totalValue += (product.price * product.countInStock);
        });
        
        const result = {
            bestSelling: bestSellingProducts.slice(0, 5).map(mapProductForResponse),
            mostStocked: mostStockedProducts.slice(0, 5).map(mapProductForResponse),
            lowStock: lowStockProducts.slice(0, 5).map(mapProductForResponse),
            highValueInventory: highValueInventory.slice(0, 5).map(mapProductForResponse),
            totalProducts: products.length,
            totalInventoryValue: totalInventoryValue,
            totalSold: totalSold,
            categoryAnalysis: categoryAnalysis
        };
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error getting product statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product statistics',
            error: error.message
        });
    }
});

/**
 * Lấy sản phẩm liên quan theo danh mục
 * 
 * @route GET /api/v1/products/related/:categoryId
 * @param {string} categoryId - ID của danh mục
 * @query {string} exclude - Danh sách ID sản phẩm cần loại trừ, phân cách bởi dấu phẩy
 * @returns {Object} Danh sách sản phẩm liên quan
 * @description Trả về danh sách sản phẩm cùng danh mục, loại trừ các sản phẩm đã chọn
 */
router.get('/related/:categoryId', async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { exclude } = req.query; // Chuỗi các ID sản phẩm cần loại trừ, ngăn cách bởi dấu phẩy
      
      // Kiểm tra categoryId
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid category ID format' 
        });
      }
      
      // Kiểm tra xem category có tồn tại không
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ 
          success: false, 
          message: 'Category not found' 
        });
      }
      
      // Xử lý danh sách sản phẩm cần loại trừ
      let excludeIds = [];
      if (exclude) {
        excludeIds = exclude.split(',').filter(id => mongoose.isValidObjectId(id));
      }
      
      // Tìm sản phẩm cùng category, loại trừ các sản phẩm đã có trong giỏ hàng
      const query = {
        category: categoryId
      };
      
      // Chỉ thêm điều kiện loại trừ nếu có sản phẩm cần loại trừ
      if (excludeIds.length > 0) {
        query._id = { $nin: excludeIds };
      }
      
      // Tìm sản phẩm theo query
      const relatedProducts = await Product.find(query)
        .populate('category')
        .limit(5);
      
      // Kiểm tra kết quả
      if (!relatedProducts || relatedProducts.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'No related products found' 
        });
      }
      
      // Trả về kết quả thành công
      res.status(200).json({
        success: true,
        count: relatedProducts.length,
        data: relatedProducts
      });
    } catch (error) {
      console.error('Error getting related products:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error', 
        error: error.message 
      });
    }
  });
  
/**
 * Tạo sản phẩm ngẫu nhiên từ Unsplash
 * 
 * @route POST /api/v1/products/random/:query/:per_page/:categoryId?
 * @param {string} query - Từ khóa tìm kiếm trên Unsplash
 * @param {number} per_page - Số lượng sản phẩm cần tạo
 * @param {string} categoryId - ID của danh mục (tùy chọn)
 * @returns {Object} Thông tin về các sản phẩm đã tạo
 * @description Tạo sản phẩm ngẫu nhiên từ hình ảnh Unsplash cho mục đích demo
 */
router.post('/random/:query/:per_page/:categoryId?', async (req, res) => {
    //http://localhost:3000/api/v1/products/random/Fashion/100/67fe376041cbb6cec620bcfc
    try {
        const query = req.params.query;
        const perPage = parseInt(req.params.per_page);
        // Sử dụng categoryId từ tham số URL hoặc từ body nếu có, nếu không sử dụng ID mặc định
        const categoryId = req.params.categoryId || req.body.categoryId || '67fe1a2d8fee74bae6966f89';
        
        // Kiểm tra tham số
        if (!query) {
            return res.status(400).send('Query parameter is required');
        }
        
        if (isNaN(perPage) || perPage <= 0) {
            return res.status(400).send('Per_page must be a positive number');
        }
        
        // Kiểm tra danh mục có tồn tại không
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).send('Invalid Category ID');
        }
        
        // Kiểm tra API key
        if (!process.env.UNSPLASH_API_KEY) {
            return res.status(500).send('Unsplash API key is not configured');
        }
        
        // Gọi API Unsplash để lấy dữ liệu
        const unsplashResponse = await axios.get(`https://api.unsplash.com/search/photos`, {
            params: {
                query: query,
                per_page: perPage,
                client_id: process.env.UNSPLASH_API_KEY
            }
        });
        
        // Kiểm tra kết quả từ Unsplash
        if (!unsplashResponse.data || !unsplashResponse.data.results || unsplashResponse.data.results.length === 0) {
            return res.status(404).send('No images found on Unsplash for the given query');
        }
        
        // Tạo mảng các promise để lưu nhiều sản phẩm cùng lúc
        const productPromises = unsplashResponse.data.results.map(async (item) => {
            const description = item.description || item.alt_description || `${query} product`;
            const richDescription = item.alt_description || item.description || `Premium ${query}`;
            
            // Tạo sản phẩm mới từ dữ liệu Unsplash
            const product = new Product({
                name: `${query.charAt(0).toUpperCase() + query.slice(1)} ${item.id}`,
                description: description,
                richDescription: richDescription,
                image: item.urls.regular,
                images: [item.urls.small, item.urls.thumb],
                brand: item.user.username,
                price: getRandomNumber(10, 100),
                category: categoryId,
                countInStock: getRandomNumber(10, 100),
                rating: Math.min(5, item.likes / 100),
                numReviews: Math.floor(item.likes / 2),
                isFeatured: false,
            });
            
            return product.save();
        });
        
        const savedProducts = await Promise.all(productPromises);
        
        res.status(201).json({
            success: true,
            message: `Successfully created ${savedProducts.length} products from Unsplash`,
            category: category.name,
            products: savedProducts
        });
        
    } catch (error) {
        console.error('Error creating random products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create random products',
            error: error.message
        });
    }
});

/**
 * Tạo sản phẩm mới
 * 
 * @route POST /api/v1/products
 * @param {Object} req.body - Dữ liệu sản phẩm
 * @param {File} req.file - File hình ảnh sản phẩm
 * @returns {Object} Sản phẩm đã tạo
 * @description Tạo một sản phẩm mới với hình ảnh
 */
router.post(`/`, uploadOptions.single('image'), async (req, res) => {
    //http://localhost:3000/api/v1/products (using form data in postman)
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send('Invalid Category');

    const file = req.file;
    if (!file) return res.status(400).send('No image in the request');

    const fileName = file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: `${basePath}${fileName}`, // "http://localhost:3000/public/upload/image-2323232"
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
    });

    product = await product.save();

    if (!product) return res.status(500).send('The product cannot be created');

    res.send(product);
});

/**
 * Cập nhật thông tin sản phẩm
 * 
 * @route PUT /api/v1/products/:id
 * @param {string} id - ID của sản phẩm
 * @param {Object} req.body - Dữ liệu cập nhật
 * @returns {Object} Sản phẩm đã cập nhật
 * @description Cập nhật thông tin sản phẩm, giữ nguyên hình ảnh
 */
router.put('/:id', async (req, res) => {
    // Kiểm tra ID sản phẩm có hợp lệ không
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Product Id');
    }
    
    // Kiểm tra danh mục có tồn tại không
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send('Invalid Category');

    // Lấy sản phẩm hiện tại để giữ lại trường image
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) return res.status(404).send('Product not found');

    // Tạo đối tượng cập nhật với các trường từ request
    const updateData = {
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
        // Giữ nguyên trường image từ sản phẩm hiện tại
        image: existingProduct.image
    };

    // Cập nhật sản phẩm
    const product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
    );

    if (!product) return res.status(500).send('the product cannot be updated!');

    res.send(product);
});

/**
 * Cập nhật bộ sưu tập hình ảnh cho sản phẩm
 * 
 * @route PUT /api/v1/products/gallery-images/:id
 * @param {string} id - ID của sản phẩm
 * @param {Array<File>} req.files - Các file hình ảnh
 * @returns {Object} Sản phẩm đã cập nhật
 * @description Thêm nhiều hình ảnh vào bộ sưu tập của sản phẩm
 */
router.put(
    //http://localhost:3000/api/v1/products/gallery-images/67df90da28fad50fcf12f36f (insert form data more images instead image)
    '/gallery-images/:id',
    uploadOptions.array('images', 10),
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send('Invalid Product Id');
        }
        const files = req.files;
        let imagesPaths = [];
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

        if (files) {
            files.map((file) => {
                imagesPaths.push(`${basePath}${file.filename}`);
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                images: imagesPaths,
            },
            { new: true }
        );

        if (!product)
            return res.status(500).send('the gallery cannot be updated!');

        res.send(product);
    }
);

/**
 * Xóa sản phẩm
 * 
 * @route DELETE /api/v1/products/:id
 * @param {string} id - ID của sản phẩm
 * @returns {Object} Thông báo kết quả xóa
 * @description Xóa sản phẩm khỏi hệ thống
 */
router.delete('/:id', (req, res) => {
    //http://localhost:3000/api/v1/products/67dc2df1e9f9a61e71402b42
    Product.findByIdAndDelete(req.params.id)
        .then((product) => {
            if (product) {
                return res.status(200).json({
                    success: true,
                    message: 'the product is deleted!',
                });
            } else {
                return res
                    .status(404)
                    .json({ success: false, message: 'product not found!' });
            }
        })
        .catch((err) => {
            return res.status(500).json({ success: false, error: err });
        });
});

module.exports = router;
