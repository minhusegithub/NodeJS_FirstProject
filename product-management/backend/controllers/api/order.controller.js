import Order from '../../models/order.model.js';
import Cart from '../../models/cart.model.js';
import Product from '../../models/product.model.js';

// [POST] /api/v1/orders/checkout
export const checkout = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userInfo, paymentMethod = 'COD' } = req.body;

        // Validate user info
        if (!userInfo || !userInfo.fullName || !userInfo.phone || !userInfo.address) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin!'
            });
        }

        // Get user cart with populated products
        const cart = await Cart.findOne({ user_id: userId })
            .populate('products.product_id');

        if (!cart || cart.products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống!'
            });
        }

        // Build products snapshot and calculate total
        const productsSnapshot = [];
        let totalPrice = 0;

        for (const item of cart.products) {
            const product = item.product_id;

            // Check if product exists
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Một số sản phẩm trong giỏ hàng không tồn tại!'
                });
            }

            // Check stock availability
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${product.title}" không đủ hàng trong kho! (Còn ${product.stock} sản phẩm)`
                });
            }

            // Calculate prices at checkout time
            const priceNew = product.price * (100 - product.discountPercentage) / 100;
            const itemTotal = priceNew * item.quantity;

            // SNAPSHOT: Freeze all product data at purchase time
            productsSnapshot.push({
                product_id: product._id,

                // Product info snapshot
                title: product.title,
                slug: product.slug,
                thumbnail: product.thumbnail,
                description: product.description || '',

                // Pricing snapshot
                price: product.price,
                discountPercentage: product.discountPercentage,
                priceNew: priceNew,  // Calculated price after discount

                // Inventory snapshot
                stock: product.stock,  // Stock level at purchase time

                // Order specifics
                quantity: item.quantity,
                totalPrice: itemTotal
            });

            totalPrice += itemTotal;

            // Update product stock
            product.stock -= item.quantity;
            await product.save();
        }

        // Create order with full snapshot
        const order = new Order({
            user_id: userId,
            userInfo: {
                fullName: userInfo.fullName,
                phone: userInfo.phone,
                address: userInfo.address,
                email: req.user.email
            },
            products: productsSnapshot,  // Full snapshot data
            totalPrice,
            paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'pending' : 'pending',
            status: 'pending'
        });

        await order.save();

        // Clear cart after successful order
        await Cart.deleteOne({ user_id: userId });

        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công!',
            data: { order }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [GET] /api/v1/orders
export const getOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;
        const total = await Order.countDocuments({ user_id: userId, deleted: false });
        const totalPages = Math.ceil(total / limit);

        const orders = await Order
            .find({ user_id: userId, deleted: false })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    limit: parseInt(limit),
                    total
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [GET] /api/v1/orders/:id
export const getOrderDetail = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const order = await Order.findOne({
            _id: id,
            user_id: userId,
            deleted: false
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng!'
            });
        }

        res.json({
            success: true,
            data: { order }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [PATCH] /api/v1/orders/:id/cancel
export const cancelOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const order = await Order.findOne({
            _id: id,
            user_id: userId,
            deleted: false
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng!'
            });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể hủy đơn hàng đang chờ xử lý!'
            });
        }

        // Restore product stock
        for (const item of order.products) {
            await Product.updateOne(
                { _id: item.product_id },
                { $inc: { stock: item.quantity } }
            );
        }

        order.status = 'cancelled';
        await order.save();

        res.json({
            success: true,
            message: 'Đã hủy đơn hàng!',
            data: { order }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
