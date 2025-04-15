const { Order } = require('../models/order');
const { OrderItem } = require('../models/order-item');
const express = require('express');
const router = express.Router();
const { sendOrderConfirmationEmail } = require('../helpers/email-service');

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
    });
    order = await order.save();

    if (!order) return res.status(400).send('the order cannot be created!');

    // After successfully creating the order, send confirmation email
    try {
        // First, populate the order with product details for the email
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
        // Continue with response even if email fails
    }

    res.send(order);
});

// Hàm để tạo số ngẫu nhiên trong khoảng
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Endpoint mới để tạo đơn hàng ngẫu nhiên
router.post('/random/:userid/:count?', async (req, res) => {
    try {
        const userId = req.params.userid;
        // Số lượng đơn hàng cần tạo, mặc định là 1
        const orderCount = parseInt(req.params.count) || 1;
        
        // Kiểm tra user ID
        const { User } = require('../models/user');
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }
        
        // Lấy danh sách sản phẩm từ database
        const { Product } = require('../models/product');
        const products = await Product.find();
        
        if (!products || products.length === 0) {
            return res.status(404).send('No products found in database');
        }
        
        // Mảng để lưu các đơn hàng đã tạo
        const createdOrders = [];
        
        // Tạo nhiều đơn hàng theo số lượng yêu cầu
        for (let i = 0; i < orderCount; i++) {
            // Số lượng sản phẩm trong đơn hàng (từ 1 đến 5)
            const productCount = getRandomNumber(1, 5);
            
            // Tạo danh sách sản phẩm ngẫu nhiên cho đơn hàng
            const orderItemsIds = await Promise.all(
                Array.from({ length: productCount }, async () => {
                    // Chọn sản phẩm ngẫu nhiên
                    const randomProduct = products[getRandomNumber(0, products.length - 1)];
                    // Tạo số lượng ngẫu nhiên (từ 1 đến 10)
                    const randomQuantity = getRandomNumber(1, 10);
                    
                    // Tạo và lưu OrderItem
                    let newOrderItem = new OrderItem({
                        quantity: randomQuantity,
                        product: randomProduct._id,
                    });
                    
                    newOrderItem = await newOrderItem.save();
                    return newOrderItem._id;
                })
            );
            
            // Tính tổng giá trị đơn hàng
            const totalPrices = await Promise.all(
                orderItemsIds.map(async (orderItemId) => {
                    const orderItem = await OrderItem.findById(orderItemId).populate(
                        'product',
                        'price'
                    );
                    const totalPrice = orderItem.product.price * orderItem.quantity;
                    return totalPrice;
                })
            );
            
            const totalPrice = totalPrices.reduce((a, b) => a + b, 0);
            
            // Tạo thông tin địa chỉ ngẫu nhiên
            const cities = ["Ho Chi Minh City", "Hanoi", "Da Nang", "Nha Trang", "Can Tho"];
            const countries = ["Vietnam", "USA", "Japan", "Singapore", "Thailand"];
            
            // Tạo và lưu đơn hàng
            let order = new Order({
                orderItems: orderItemsIds,
                shippingAddress1: `${getRandomNumber(1, 100)} Flowers Street, ${getRandomNumber(1, 999)}`,
                shippingAddress2: `${getRandomNumber(1, 20)}-${String.fromCharCode(65 + getRandomNumber(0, 25))}`,
                city: cities[getRandomNumber(0, cities.length - 1)],
                zip: `${getRandomNumber(10000, 99999)}`,
                country: countries[getRandomNumber(0, countries.length - 1)],
                phone: `+${getRandomNumber(10000000, 99999999)}`,
                status: "Pending",
                totalPrice: totalPrice,
                user: userId,
            });
            
            order = await order.save();
            
            if (!order) {
                throw new Error(`Failed to create order ${i+1}`);
            }
            
            // Thêm đơn hàng đã tạo vào mảng kết quả
            createdOrders.push(order);
        }
        
        // Trả về kết quả
        res.status(201).json({
            success: true,
            message: `Successfully created ${createdOrders.length} random orders for user ${userId}`,
            orders: createdOrders
        });
        
    } catch (error) {
        console.error('Error creating random orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create random orders',
            error: error.message
        });
    }
});


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
