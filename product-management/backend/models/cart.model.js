import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        products: [
            {
                product_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                    default: 1
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

// Index for fast user cart lookup
cartSchema.index({ user_id: 1 });

const Cart = mongoose.model('Cart', cartSchema, "carts");

export default Cart;
