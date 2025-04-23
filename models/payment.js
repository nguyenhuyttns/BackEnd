// models/payment.js
const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    provider: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'PENDING',
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']
    },
    paymentId: {
        type: String,
        required: true
    },
    requestId: {
        type: String,
        required: true
    },
    payUrl: {
        type: String,
        required: false
    },
    transId: {
        type: String,
        default: null
    },
    responseData: {
        type: Object,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

paymentSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

paymentSchema.set('toJSON', {
    virtuals: true,
});

exports.Payment = mongoose.model('Payment', paymentSchema);
