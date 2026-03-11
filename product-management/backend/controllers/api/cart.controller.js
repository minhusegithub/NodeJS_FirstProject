import { Cart, CartItem, ProductStoreInventory, Product, Store } from '../../models/sequelize/index.js';
import { isRedisReady, redisGet, redisSet, redisDel } from '../../config/redis.js';

// [GET] /api/v1/cart
export const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cacheKey = `cart:${userId}`;

        // 1. Thử cache trước
        if (isRedisReady()) {
            const cached = await redisGet(cacheKey);
            if (cached) {
                return res.json({
                    code: 200,
                    message: 'Success (cached)',
                    data: JSON.parse(cached)
                });
            }
        }

        // 2. Cache miss → query DB
        let cart = await Cart.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [
                        {
                            model: ProductStoreInventory,
                            as: 'inventory',
                            include: [
                                {
                                    model: Product,
                                    as: 'product',
                                    attributes: ['id', 'title', 'price', 'discount_percentage', 'thumbnail', 'slug']
                                },
                                {
                                    model: Store,
                                    as: 'store',
                                    attributes: ['id', 'name', 'code']
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        if (!cart) {
            // Create empty cart
            cart = await Cart.create({ user_id: userId });
            const emptyCart = { items: [], total_price: 0 };
            // Lưu empty cart vào cache
            await redisSet(cacheKey, JSON.stringify(emptyCart), 3600);
            return res.json({
                code: 200,
                message: 'Success',
                data: emptyCart
            });
        }

        // Calculate total price
        let totalPrice = 0;
        const items = cart.items.map(item => {
            const product = item.inventory.product;
            const finalPrice = product.price * (100 - (product.discount_percentage || 0)) / 100;
            const itemTotal = finalPrice * item.quantity;
            totalPrice += itemTotal;

            return {
                id: item.id,
                inventory_id: item.inventory_id,
                quantity: item.quantity,
                product: {
                    id: product.id,
                    title: product.title,
                    price: product.price,
                    discount_percentage: product.discount_percentage,
                    thumbnail: product.thumbnail,
                    slug: product.slug
                },
                store: {
                    id: item.inventory.store.id,
                    name: item.inventory.store.name,
                    code: item.inventory.store.code
                },
                stock: item.inventory.stock,
                item_total: itemTotal
            };
        });

        const cartData = {
            items,
            total_price: totalPrice
        };

        // 3. Lưu vào cache (TTL 1 giờ)
        await redisSet(cacheKey, JSON.stringify(cartData), 3600);

        res.json({
            code: 200,
            message: 'Success',
            data: cartData
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            code: 500,
            message: error.message
        });
    }
};

// [POST] /api/v1/cart/add
export const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { inventory_id, quantity = 1 } = req.body;

        // Validate inventory_id
        if (!inventory_id) {
            return res.status(400).json({
                code: 400,
                message: 'Vui lòng chọn cửa hàng!'
            });
        }

        // Check if inventory exists and has stock
        const inventory = await ProductStoreInventory.findByPk(inventory_id, {
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'title']
                }
            ]
        });

        if (!inventory) {
            return res.status(404).json({
                code: 404,
                message: 'Sản phẩm không tồn tại tại cửa hàng này!'
            });
        }

        if (inventory.status !== 'active') {
            return res.status(400).json({
                code: 400,
                message: 'Sản phẩm không còn hoạt động!'
            });
        }

        if (inventory.stock < quantity) {
            return res.status(400).json({
                code: 400,
                message: `Không đủ hàng! Chỉ còn ${inventory.stock} sản phẩm.`
            });
        }

        // Get or create cart
        let cart = await Cart.findOne({ where: { user_id: userId } });
        if (!cart) {
            cart = await Cart.create({ user_id: userId });
        }

        // Check if item already in cart
        const existingItem = await CartItem.findOne({
            where: {
                cart_id: cart.id,
                inventory_id: inventory_id
            }
        });

        if (existingItem) {
            // Update quantity
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > inventory.stock) {
                return res.status(400).json({
                    code: 400,
                    message: `Không đủ hàng! Chỉ còn ${inventory.stock} sản phẩm.`
                });
            }
            existingItem.quantity = newQuantity;
            await existingItem.save();
        } else {
            // Add new item
            await CartItem.create({
                cart_id: cart.id,
                inventory_id: inventory_id,
                quantity: quantity
            });
        }

        // Invalidate cart cache
        await redisDel(`cart:${req.user.id}`);

        res.json({
            code: 200,
            message: 'Đã thêm vào giỏ hàng!',
            data: { cart_id: cart.id }
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            code: 500,
            message: error.message
        });
    }
};

// [PATCH] /api/v1/cart/update
export const updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cart_item_id, quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({
                code: 400,
                message: 'Số lượng phải lớn hơn 0!'
            });
        }

        // Find cart item
        const cartItem = await CartItem.findOne({
            where: { id: cart_item_id },
            include: [
                {
                    model: Cart,
                    as: 'cart',
                    where: { user_id: userId }
                },
                {
                    model: ProductStoreInventory,
                    as: 'inventory'
                }
            ]
        });

        if (!cartItem) {
            return res.status(404).json({
                code: 404,
                message: 'Không tìm thấy sản phẩm trong giỏ hàng!'
            });
        }

        // Check stock
        if (quantity > cartItem.inventory.stock) {
            return res.status(400).json({
                code: 400,
                message: `Không đủ hàng! Chỉ còn ${cartItem.inventory.stock} sản phẩm.`
            });
        }

        cartItem.quantity = quantity;
        await cartItem.save();

        // Invalidate cart cache
        await redisDel(`cart:${userId}`);

        res.json({
            code: 200,
            message: 'Đã cập nhật giỏ hàng!',
            data: { cart_item: cartItem }
        });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({
            code: 500,
            message: error.message
        });
    }
};

// [DELETE] /api/v1/cart/remove/:id
export const removeCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const cartItem = await CartItem.findOne({
            where: { id },
            include: [
                {
                    model: Cart,
                    as: 'cart',
                    where: { user_id: userId }
                }
            ]
        });

        if (!cartItem) {
            return res.status(404).json({
                code: 404,
                message: 'Không tìm thấy sản phẩm trong giỏ hàng!'
            });
        }

        await cartItem.destroy();

        // Invalidate cart cache
        await redisDel(`cart:${req.user.id}`);

        res.json({
            code: 200,
            message: 'Đã xóa sản phẩm khỏi giỏ hàng!'
        });
    } catch (error) {
        console.error('Remove cart item error:', error);
        res.status(500).json({
            code: 500,
            message: error.message
        });
    }
};

// [DELETE] /api/v1/cart/clear
export const clearCart = async (req, res) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({ where: { user_id: userId } });
        if (!cart) {
            // Invalidate cache even if cart doesn't exist
            await redisDel(`cart:${userId}`);
            return res.json({
                code: 200,
                message: 'Giỏ hàng đã trống!'
            });
        }

        await CartItem.destroy({ where: { cart_id: cart.id } });

        // Invalidate cart cache
        await redisDel(`cart:${userId}`);

        res.json({
            code: 200,
            message: 'Đã xóa toàn bộ giỏ hàng!'
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            code: 500,
            message: error.message
        });
    }
};
