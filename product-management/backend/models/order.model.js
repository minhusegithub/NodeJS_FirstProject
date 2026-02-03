import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        userInfo: {
            fullName: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            email: { type: String, required: true }
        },
        // SNAPSHOT PATTERN: Freeze product data at checkout time
        products: [
            {
                // Trace original product (for reference only, do not populate when displaying)
                product_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },

                // SNAPSHOT: Frozen values at purchase time
                title: { type: String, required: true },
                slug: { type: String, required: true },
                thumbnail: { type: String, required: true },
                description: String,

                // Pricing snapshot
                price: { type: Number, required: true },           // Original price
                discountPercentage: { type: Number, default: 0 },  // Discount %
                priceNew: { type: Number, required: true },        // Price after discount (calculated)

                // Inventory snapshot
                stock: { type: Number, required: true },           // Stock at purchase time

                // Order specifics
                quantity: { type: Number, required: true, min: 1 },
                totalPrice: { type: Number, required: true }       // priceNew * quantity
            }
        ],
        totalPrice: { type: Number, required: true },
        paymentMethod: {
            type: String,
            enum: ['COD', 'VNPay'],
            default: 'COD'
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
            default: 'pending'
        },
        isPlaceRushOrder: {
            type: Boolean,
            default: false
        },
        vnpayTransactionId: String,
        deleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Indexes for efficient queries
orderSchema.index({ user_id: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model('Order', orderSchema, "orders");

export default Order;
