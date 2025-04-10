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
