const { Order } = require('../models/order');
const { OrderItem } = require('../models/order-item');
const express = require('express');
const router = express.Router();
const { sendOrderConfirmationEmail } = require('../helpers/email-service');


/**
 * Lấy danh sách tất cả đơn hàng
 * 
 * @route GET /api/v1/orders
 * @returns {Array} Danh sách tất cả đơn hàng
 * @description Trả về danh sách tất cả đơn hàng, sắp xếp theo ngày đặt hàng mới nhất
 */
router.get(`/`, async (req, res) => {
    //http://localhost:3000/api/v1/orders (find all order)
    const orderList = await Order.find()
        .populate('user', 'name')
        .sort({ dateOrdered: -1 });

    if (!orderList) {
        res.status(500).json({ success: false });
    }
    res.send(orderList);
});

/**
 * Lấy thông tin chi tiết một đơn hàng
 * 
 * @route GET /api/v1/orders/:id
 * @param {string} id - ID của đơn hàng
 * @returns {Object} Thông tin chi tiết đơn hàng
 * @description Trả về thông tin đơn hàng với các chi tiết sản phẩm và danh mục
 */
router.get(`/:id`, async (req, res) => {
    //
    const order = await Order.findById(req.params.id)
        .populate('user', 'name')
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category',
            },
        });

    if (!order) {
        res.status(500).json({ success: false });
    }
    res.send(order);
});

/**
 * Lấy tổng doanh số bán hàng
 * 
 * @route GET /api/v1/orders/get/totalsales
 * @returns {Object} Tổng doanh số
 * @description Tính tổng doanh số từ tất cả các đơn hàng
 */
router.get('/get/totalsales', async (req, res) => {
    //http://localhost:3000/api/v1/orders/get/totalsales (sum the total sales)
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } },
    ]);

    if (!totalSales) {
        return res.status(400).send('The order sales cannot be generated');
    }

    res.send({ totalsales: totalSales.pop().totalsales });
});

/**
 * Lấy số lượng đơn hàng
 * 
 * @route GET /api/v1/orders/get/count
 * @returns {Object} Số lượng đơn hàng
 * @description Đếm tổng số đơn hàng trong hệ thống
 */
router.get(`/get/count`, async (req, res) => {
    //http://localhost:3000/api/v1/orders/get/count (count the number of order)
    const orderCount = await Order.countDocuments();

    if (!orderCount) {
        res.status(500).json({ success: false });
    }
    res.send({
        orderCount: orderCount,
    });
});

/**
 * Lấy danh sách đơn hàng của một người dùng
 * 
 * @route GET /api/v1/orders/get/userorders/:userid
 * @param {string} userid - ID của người dùng
 * @returns {Array} Danh sách đơn hàng của người dùng
 * @description Trả về tất cả đơn hàng của một người dùng cụ thể
 */
router.get(`/get/userorders/:userid`, async (req, res) => {
    //http://localhost:3000/api/v1/orders/get/userorders/67dd0e237934ed172345c5e4 (get oder of user)

    const userOrderList = await Order.find({ user: req.params.userid })
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category',
            },
        })
        .sort({ dateOrdered: -1 });

    if (!userOrderList) {
        res.status(500).json({ success: false });
    }
    res.send(userOrderList);
});

/**
 * Tạo đơn hàng mới
 * 
 * @route POST /api/v1/orders
 * @param {Object} req.body - Dữ liệu đơn hàng
 * @param {Array} req.body.orderItems - Danh sách các mặt hàng trong đơn hàng
 * @param {string} req.body.shippingAddress1 - Địa chỉ giao hàng 1
 * @param {string} req.body.shippingAddress2 - Địa chỉ giao hàng 2 (tùy chọn)
 * @param {string} req.body.city - Thành phố
 * @param {string} req.body.zip - Mã bưu điện
 * @param {string} req.body.country - Quốc gia
 * @param {string} req.body.phone - Số điện thoại
 * @param {string} req.body.status - Trạng thái đơn hàng
 * @param {string} req.body.user - ID của người dùng
 * @param {string} req.body.paymentMethod - Phương thức thanh toán
 * @returns {Object} Đơn hàng đã tạo
 * @description Tạo đơn hàng mới và gửi email xác nhận
 */
router.post('/', async (req, res) => {
    const orderItemsIds = Promise.all(
        req.body.orderItems.map(async (orderItem) => {
            let newOrderItem = new OrderItem({
                quantity: orderItem.quantity,
                product: orderItem.product,
            });

            newOrderItem = await newOrderItem.save();

            return newOrderItem._id;
        })
    );
    const orderItemsIdsResolved = await orderItemsIds;

    const totalPrices = await Promise.all(
        orderItemsIdsResolved.map(async (orderItemId) => {
            const orderItem = await OrderItem.findById(orderItemId).populate(
                'product',
                'price'
            );
            const totalPrice = orderItem.product.price * orderItem.quantity;
            return totalPrice;
        })
    );

    const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

    let order = new Order({
        orderItems: orderItemsIdsResolved,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        status: req.body.status || 'Pending',
        totalPrice: totalPrice,
        user: req.body.user,
        // Thêm các trường mới
        paymentMethod: req.body.paymentMethod || 'COD',
        paymentStatus: req.body.paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
    });
    order = await order.save();

    if (!order) return res.status(400).send('the order cannot be created!');

    // After successfully creating the order, send confirmation email
    try {
        const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email')
            .populate({
                path: 'orderItems',
                populate: {
                    path: 'product',
                    populate: 'category',
                },
            });

        // Get user email from the user ID
        const { User } = require('../models/user');
        const user = await User.findById(req.body.user);

        if (user && user.email) {
            await sendOrderConfirmationEmail(user.email, populatedOrder);
            console.log(`Order confirmation email sent to ${user.email}`);
        } else {
            console.log('User email not found, cannot send order confirmation');
        }
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
    }

    res.send(order);
});

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
 * Tạo đơn hàng ngẫu nhiên cho người dùng
 * 
 * @route POST /api/v1/orders/random/:userid/:count?
 * @param {string} userid - ID của người dùng
 * @param {number} count - Số lượng đơn hàng cần tạo (tùy chọn, mặc định là 1)
 * @returns {Object} Thông tin về các đơn hàng đã tạo
 * @description Tạo một hoặc nhiều đơn hàng ngẫu nhiên cho mục đích kiểm thử
 */
router.post('/random/:userid/:count?', async (req, res) => {
    try {
        const userId = req.params.userid;
        const orderCount = parseInt(req.params.count) || 1;

        const { User } = require('../models/user');
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

      
        const { Product } = require('../models/product');
        const products = await Product.find();

        if (!products || products.length === 0) {
            return res.status(404).send('No products found in database');
        }

        const createdOrders = [];

        for (let i = 0; i < orderCount; i++) {
            const productCount = getRandomNumber(1, 5);
            const orderItemsIds = await Promise.all(
                Array.from({ length: productCount }, async () => {
                    const randomProduct =
                        products[getRandomNumber(0, products.length - 1)];
                    const randomQuantity = getRandomNumber(1, 10);

                    let newOrderItem = new OrderItem({
                        quantity: randomQuantity,
                        product: randomProduct._id,
                    });

                    newOrderItem = await newOrderItem.save();
                    return newOrderItem._id;
                })
            );

            const totalPrices = await Promise.all(
                orderItemsIds.map(async (orderItemId) => {
                    const orderItem = await OrderItem.findById(
                        orderItemId
                    ).populate('product', 'price');
                    const totalPrice =
                        orderItem.product.price * orderItem.quantity;
                    return totalPrice;
                })
            );

            const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

            const cities = [
                'Ho Chi Minh City',
                'Hanoi',
                'Da Nang',
                'Nha Trang',
                'Can Tho',
            ];
            const countries = [
                'Vietnam',
                'USA',
                'Japan',
                'Singapore',
                'Thailand',
            ];

            let order = new Order({
                orderItems: orderItemsIds,
                shippingAddress1: `${getRandomNumber(1, 100)} Flowers Street, ${getRandomNumber(1, 999)}`,
                shippingAddress2: `${getRandomNumber(1, 20)}-${String.fromCharCode(65 + getRandomNumber(0, 25))}`,
                city: cities[getRandomNumber(0, cities.length - 1)],
                zip: `${getRandomNumber(10000, 99999)}`,
                country: countries[getRandomNumber(0, countries.length - 1)],
                phone: `+${getRandomNumber(10000000, 99999999)}`,
                status: 'Shipped',
                totalPrice: totalPrice,
                user: userId,
            });

            order = await order.save();

            if (!order) {
                throw new Error(`Failed to create order ${i + 1}`);
            }

            createdOrders.push(order);
        }

        res.status(201).json({
            success: true,
            message: `Successfully created ${createdOrders.length} random orders for user ${userId}`,
            orders: createdOrders,
        });
    } catch (error) {
        console.error('Error creating random orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create random orders',
            error: error.message,
        });
    }
});

/**
 * Cập nhật trạng thái đơn hàng
 * 
 * @route PUT /api/v1/orders/:id
 * @param {string} id - ID của đơn hàng
 * @param {Object} req.body - Dữ liệu cập nhật
 * @param {string} req.body.status - Trạng thái mới của đơn hàng
 * @returns {Object} Đơn hàng đã cập nhật
 * @description Cập nhật trạng thái của một đơn hàng
 */
router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status,
        },
        { new: true }
    );

    if (!order) return res.status(400).send('the order cannot be update!');

    res.send(order);
});


/**
 * Xóa đơn hàng
 * 
 * @route DELETE /api/v1/orders/:id
 * @param {string} id - ID của đơn hàng
 * @returns {Object} Thông báo kết quả xóa
 * @description Xóa đơn hàng và tất cả các mục đơn hàng liên quan
 */
router.delete('/:id', (req, res) => {
    //http://localhost:3000/api/v1/orders/67dda0f0e4beacbbad213cd9
    Order.findByIdAndDelete(req.params.id)
        .then(async (order) => {
            if (order) {
                await order.orderItems.map(async (orderItem) => {
                    await OrderItem.findByIdAndRemove(orderItem);
                });
                return res
                    .status(200)
                    .json({ success: true, message: 'the order is deleted!' });
            } else {
                return res
                    .status(404)
                    .json({ success: false, message: 'order not found!' });
            }
        })
        .catch((err) => {
            return res.status(500).json({ success: false, error: err });
        });
});

module.exports = router;
