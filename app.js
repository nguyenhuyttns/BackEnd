const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv/config');

const api = process.env.API_URL || '/api/v1';

// Middleware
app.use(cors());
app.options('*', cors());
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import Routes
const categoriesRouter = require('./routes/categories');
const productsRouter = require('./routes/products');
const suppliersRouter = require('./routes/suppliers');

// Routes
app.use(`${api}/categories`, categoriesRouter);
app.use(`${api}/products`, productsRouter);
app.use(`${api}/suppliers`, suppliersRouter);

// Welcome route
app.get('/', (req, res) => {
    res.send('API Quản lý sản phẩm đang chạy!');
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err) {
        res.status(err.status || 500).json({
            error: {
                message: err.message
            }
        });
    }
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        message: 'Route not found'
    });
});

// Database connection - ĐÃ SỬA
mongoose
    .connect(process.env.CONNECTION_STRING)  // Bỏ options
    .then(() => {
        console.log('✅ Database Connection is ready...');
    })
    .catch((err) => {
        console.log('❌ Database connection error:', err);
    });

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 API URL: ${api}`);
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}${api}`);
});

module.exports = app;
