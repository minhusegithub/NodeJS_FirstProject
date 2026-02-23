import {
    Order,
    OrderItem,
    Product,
    ProductStoreInventory,
    Store,
    Cart,
    CartItem,
    sequelize
} from '../../models/sequelize/index.js';
import { generateRandomString } from '../../helpers/generate.js';
import { createPaymentUrl, verifyReturnUrl } from '../../helpers/vnpay.js';
import { redisDel } from '../../config/redis.js';

// [POST] /api/v1/orders/checkout
export const checkout = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { userInfo, paymentMethod = 'COD' } = req.body;
        const userId = req.user.id;

        // 1. Get cart for this user
        const cart = await Cart.findOne({
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
                                { model: Product, as: 'product' },
                                { model: Store, as: 'store' }
                            ]
                        }
                    ]
                }
            ],
            transaction
        });

        if (!cart || !cart.items || cart.items.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                code: 400,
                message: 'Giỏ hàng trống'
            });
        }

        const cartItems = cart.items;

        // 2. Group cart items by store
        const ordersByStore = {};

        for (const cartItem of cartItems) {
            const storeId = cartItem.inventory.store_id;
            const product = cartItem.inventory.product;
            const inventory = cartItem.inventory;

            // Check stock
            if (inventory.stock < cartItem.quantity) {
                await transaction.rollback();
                return res.status(400).json({
                    code: 400,
                    message: `Sản phẩm "${product.title}" không đủ hàng tại cửa hàng`
                });
            }

            // Calculate price
            const currentPrice = Math.round(product.price * (100 - (product.discount_percentage || 0)) / 100);
            const itemTotal = currentPrice * cartItem.quantity;

            if (!ordersByStore[storeId]) {
                ordersByStore[storeId] = {
                    store: inventory.store,
                    items: [],
                    totalPrice: 0
                };
            }

            ordersByStore[storeId].items.push({
                cartItemId: cartItem.id,
                product,
                inventory,
                quantity: cartItem.quantity,
                price: product.price,
                discountPercentage: product.discount_percentage || 0,
                priceNew: currentPrice,
                totalPrice: itemTotal
            });

            ordersByStore[storeId].totalPrice += itemTotal;
        }

        // 3. Create orders for each store
        const createdOrders = [];
        let grandTotal = 0;

        for (const [storeId, orderData] of Object.entries(ordersByStore)) {
            const orderCode = `ORD-${Date.now()}-${generateRandomString(4).toUpperCase()}`;

            const newOrder = await Order.create({
                code: orderCode,
                user_id: userId,
                store_id: parseInt(storeId),
                user_info: userInfo,
                total_price: orderData.totalPrice,
                payment_method: paymentMethod,
                payment_status: paymentMethod === 'COD' ? 'pending' : 'pending',
                status: 'pending'
            }, { transaction });

            // Create order items and update stock
            for (const item of orderData.items) {
                await OrderItem.create({
                    order_id: newOrder.id,
                    product_id: item.product.id,
                    title: item.product.title,
                    slug: item.product.slug,
                    thumbnail: item.product.thumbnail,
                    price: item.price,
                    discount_percentage: item.discountPercentage,
                    price_new: item.priceNew,
                    quantity: item.quantity,
                    total_price: item.totalPrice
                }, { transaction });

                // Deduct stock
                item.inventory.stock -= item.quantity;
                await item.inventory.save({ transaction });

                // Remove from cart
                await CartItem.destroy({
                    where: { id: item.cartItemId },
                    transaction
                });
            }

            createdOrders.push(newOrder);
            grandTotal += orderData.totalPrice;
        }

        // Invalidate cart cache before committing
        await redisDel(`cart:${userId}`);

        // Commit transaction before handling payment
        await transaction.commit();

        // 4. Handle payment method
        if (paymentMethod === 'VNPay') {
            try {
                // Create VNPay payment URL
                const orderId = createdOrders[0].code; // Use first order code as reference
                const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
                // Remove diacritics AND SPACES to avoid encoding mismatch issues (Error 70)
                const simpleOrderId = orderId.replace(/[^a-zA-Z0-9-]/g, '');
                const orderInfo = `ThanhToan${simpleOrderId}`; // No spaces

                const paymentUrl = createPaymentUrl(orderId, grandTotal, orderInfo, ipAddr);

                return res.json({
                    code: 200,
                    message: 'Tạo đơn hàng thành công',
                    data: {
                        orders: createdOrders.map(o => ({ id: o.id, code: o.code })),
                        paymentUrl,
                        totalAmount: grandTotal
                    }
                });
            } catch (paymentError) {
                console.error('VNPay URL error:', paymentError);
                return res.json({
                    code: 200,
                    message: 'Tạo đơn hàng thành công (Lỗi tạo link thanh toán)',
                    data: {
                        orders: createdOrders.map(o => ({ id: o.id, code: o.code })),
                        totalAmount: grandTotal
                    }
                });
            }
        }

        // COD payment
        res.json({
            code: 200,
            message: 'Đặt hàng thành công',
            data: {
                order: createdOrders[0], // Return first order for compatibility
                orders: createdOrders.map(o => ({ id: o.id, code: o.code, _id: o.id })),
                totalAmount: grandTotal
            }
        });

    } catch (error) {
        // Only rollback if transaction hasn't been committed yet
        if (!transaction.finished) {
            await transaction.rollback();
        }
        console.error('Checkout Error:', error);
        res.status(500).json({
            code: 500,
            message: 'Lỗi server: ' + error.message
        });
    }
};

// [GET] /api/v1/orders/vnpay-return
export const vnpayReturn = async (req, res) => {
    try {
        const vnp_Params = req.query;

        // Verify signature
        const isValid = verifyReturnUrl(vnp_Params);

        if (!isValid) {
            return res.status(400).json({
                code: 400,
                message: 'Chữ ký không hợp lệ'
            });
        }

        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];

        // Find order by code
        const order = await Order.findOne({
            where: { code: orderId }
        });

        if (!order) {
            return res.status(404).json({
                code: 404,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Update payment status based on response code
        if (responseCode === '00') {
            // Payment successful
            order.payment_status = 'paid';
            order.vnp_transaction_id = vnp_Params['vnp_TransactionNo'];
            await order.save();

            return res.json({
                code: 200,
                message: 'Thanh toán thành công',
                data: {
                    orderId: order.id,
                    orderCode: order.code
                }
            });
        } else {
            // Payment failed
            order.payment_status = 'failed';
            await order.save();

            return res.status(400).json({
                code: 400,
                message: 'Thanh toán thất bại',
                data: {
                    orderId: order.id,
                    orderCode: order.code,
                    responseCode
                }
            });
        }

    } catch (error) {
        console.error('VNPay Return Error:', error);
        res.status(500).json({
            code: 500,
            message: 'Lỗi server: ' + error.message
        });
    }
};
