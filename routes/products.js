const { Product } = require('../models/product');
const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios')

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
};

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

const uploadOptions = multer({ storage: storage });

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

router.get(`/:id`, async (req, res) => {
    //http://localhost:3000/api/v1/products/67dcea5740cea065c85174aa (find by id)
    const product = await Product.findById(req.params.id).populate('category');

    if (!product) {
        res.status(500).json({ success: false });
    }
    res.send(product);
});

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

router.get(`/get/featured/:count`, async (req, res) => {
    //http://localhost:3000/api/v1/products/get/featured/5 (display the product is displayed)
    const count = req.params.count ? req.params.count : 0;
    const products = await Product.find({ isFeatured: true }).limit(+count);

    if (!products) {
        res.status(500).json({ success: false });
    }
    res.send(products);
});

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
            // Xử lý trường hợp description hoặc alt_description là null
            const description = item.description || item.alt_description || `${query} product`;
            const richDescription = item.alt_description || item.description || `Premium ${query}`;
            
            // Tạo sản phẩm mới từ dữ liệu Unsplash
            const product = new Product({
                name: `${query.charAt(0).toUpperCase() + query.slice(1)} ${item.id}`,
                description: description,
                richDescription: richDescription,
                image: item.urls.regular,
                images: [item.urls.small, item.urls.thumb], // Thêm các kích thước ảnh khác
                brand: item.user.username,
                price: getRandomNumber(10, 100),
                category: categoryId,
                countInStock: getRandomNumber(10, 100),
                rating: Math.min(5, item.likes / 100), // Giới hạn rating tối đa là 5
                numReviews: Math.floor(item.likes / 2),
                isFeatured: false,
            });
            
            // Lưu sản phẩm vào database
            return product.save();
        });
        
        // Chờ tất cả các promise hoàn thành
        const savedProducts = await Promise.all(productPromises);
        
        // Trả về kết quả
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
