import Cart from '../../models/cart.model.js';
import Product from '../../models/product.model.js';

// [GET] /api/v1/cart
export const index = async (req, res) => {
    try {
        const userId = req.user._id;

        let cart = await Cart.findOne({ user_id: userId })
            .populate({
                path: 'products.product_id',
                select: 'title price discountPercentage thumbnail stock slug'
            });

        if (!cart) {
            return res.json({
                success: true,
                data: {
                    products: [],
                    totalPrice: 0
                }
            });
        }

        // Build product details from populated data
        const productsWithDetails = [];
        for (const item of cart.products) {
            const product = item.product_id;

            // Skip if product was deleted
            if (!product) continue;

            const priceNew = product.price * (100 - product.discountPercentage) / 100;
            productsWithDetails.push({
                product_id: product._id,
                quantity: item.quantity,
                title: product.title,
                price: product.price,
                discountPercentage: product.discountPercentage,
                priceNew,
                thumbnail: product.thumbnail,
                stock: product.stock,
                slug: product.slug,
                totalPrice: priceNew * item.quantity
            });
        }

        const totalPrice = productsWithDetails.reduce((sum, item) => sum + item.totalPrice, 0);

        res.json({
            success: true,
            data: {
                products: productsWithDetails,
                totalPrice
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [POST] /api/v1/cart/add
export const addToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { product_id, quantity = 1 } = req.body;

        // Check if product exists
        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại!'
            });
        }

        // Check stock
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Không đủ hàng trong kho!'
            });
        }

        let cart = await Cart.findOne({ user_id: userId });

        if (!cart) {
            cart = new Cart({
                user_id: userId,
                products: [{ product_id, quantity }]
            });
        } else {
            // Fix: Compare ObjectId properly using .toString()
            const existingProduct = cart.products.find(
                item => item.product_id.toString() === product_id
            );

            if (existingProduct) {
                existingProduct.quantity += quantity;
            } else {
                cart.products.push({ product_id, quantity });
            }
        }

        await cart.save();

        res.json({
            success: true,
            message: 'Đã thêm vào giỏ hàng!',
            data: { cart }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [PATCH] /api/v1/cart/update
export const updateQuantity = async (req, res) => {
    try {
        const userId = req.user._id;
        const { product_id, quantity } = req.body;

        const cart = await Cart.findOne({ user_id: userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Giỏ hàng không tồn tại!'
            });
        }

        // Fix: Compare ObjectId properly using .toString()
        const product = cart.products.find(item => item.product_id.toString() === product_id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không có trong giỏ hàng!'
            });
        }

        product.quantity = quantity;
        await cart.save();

        res.json({
            success: true,
            message: 'Cập nhật số lượng thành công!',
            data: { cart }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [DELETE] /api/v1/cart/delete/:productId
export const deleteItem = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId } = req.params;

        const cart = await Cart.findOne({ user_id: userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Giỏ hàng không tồn tại!'
            });
        }

        // Fix: Compare ObjectId properly using .toString()
        cart.products = cart.products.filter(item => item.product_id.toString() !== productId);
        await cart.save();

        res.json({
            success: true,
            message: 'Đã xóa sản phẩm khỏi giỏ hàng!',
            data: { cart }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
