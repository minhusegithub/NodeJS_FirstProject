import {
    Order,
    OrderItem,
    Product,
    ProductStoreInventory,
    Store,
    User,
    sequelize
} from '../../models/sequelize/index.js';
import { generateRandomString } from '../../helpers/generate.js';

// [POST] /api/v1/orders
export const createOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            store_id,
            products, // [{ product_id, quantity }]
            user_info, // { fullName, phone, address, email }
            payment_method = 'COD',
            note
        } = req.body;

        // TODO: Get user_id from auth middleware. For now assumes sent in body or default to a guest/test user if logic permits, but better required.
        // Assuming req.user exists from middleware, or we require user_id in body for testing.
        const user_id = req.body.user_id || (req.user ? req.user.id : null);

        if (!user_id) {
            return res.status(401).json({ code: 401, message: "Unauthorized or User ID required" });
        }

        if (!store_id) {
            return res.status(400).json({ code: 400, message: "Store ID is required" });
        }

        if (!products || products.length === 0) {
            return res.status(400).json({ code: 400, message: "Product list is empty" });
        }

        // 1. Verify Store
        const store = await Store.findByPk(store_id, { transaction });
        if (!store || !store.is_active) {
            await transaction.rollback();
            return res.status(400).json({ code: 400, message: "Invalid or inactive Store" });
        }

        let totalPrice = 0;
        const orderItemsData = [];

        // 2. Validate Products & Stock
        for (const item of products) {
            const product = await Product.findByPk(item.product_id, {
                transaction,
                lock: transaction.LOCK.UPDATE // Lock product row to prevent race condition (optional)
            });

            if (!product || product.status !== 'active' || product.deleted_at) {
                await transaction.rollback();
                return res.status(400).json({
                    code: 400,
                    message: `Product ID ${item.product_id} not found or inactive`
                });
            }

            // Check inventory at specific store
            const inventory = await ProductStoreInventory.findOne({
                where: {
                    product_id: item.product_id,
                    store_id: store_id
                },
                transaction,
                lock: transaction.LOCK.UPDATE // Lock inventory row
            });

            if (!inventory || inventory.stock < item.quantity) {
                await transaction.rollback();
                return res.status(400).json({
                    code: 400,
                    message: `Insufficient stock for product "${product.title}" at this store`
                });
            }

            // Calculate Price
            const originalPrice = parseFloat(product.price);
            const discount = parseFloat(product.discount_percentage);
            const newPrice = originalPrice * (1 - discount / 100);
            const itemTotal = newPrice * item.quantity;

            totalPrice += itemTotal;

            // Prepare Order Item Data
            orderItemsData.push({
                product_id: product.id,
                title: product.title,
                slug: product.slug,
                thumbnail: product.thumbnail,
                price: originalPrice,
                discount_percentage: discount,
                price_new: newPrice,
                quantity: item.quantity,
                total_price: itemTotal,
                inventory_ref: inventory // Keep ref to update later
            });
        }

        // 3. Create Order
        const orderCode = `ORD-${Date.now()}-${generateRandomString(4).toUpperCase()}`;

        const newOrder = await Order.create({
            code: orderCode,
            user_id: user_id,
            store_id: store_id,
            user_info: user_info,
            total_price: totalPrice,
            payment_method,
            note,
            status: 'pending'
        }, { transaction });

        // 4. Create Items & update stock
        for (const itemData of orderItemsData) {
            await OrderItem.create({
                order_id: newOrder.id,
                product_id: itemData.product_id, // Can be null if we want to support deleted products history, but better keep it
                title: itemData.title,
                slug: itemData.slug,
                thumbnail: itemData.thumbnail,
                price: itemData.price,
                discount_percentage: itemData.discount_percentage,
                price_new: itemData.price_new,
                quantity: itemData.quantity,
                total_price: itemData.total_price
            }, { transaction });

            // Deduct Stock
            const inventory = itemData.inventory_ref;
            inventory.stock -= itemData.quantity;
            await inventory.save({ transaction });

            // Note: We should also update Global Product Stock (sum) for quick display, 
            // but for now let's focus on Store Stock.
            // (Optional logic to update total stock on Product table)
        }

        await transaction.commit();

        res.status(201).json({
            code: 201,
            message: "Order created successfully",
            data: {
                order_code: orderCode,
                total: totalPrice
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Create Order Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [GET] /api/v1/orders
export const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const user_id = req.user ? req.user.id : null; // Filter by user if client, or all if admin?
        // For now, assuming this is ADMIN List or we check role
        // Let's implement simple list for now

        const { count, rows } = await Order.findAndCountAll({
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email']
                }
            ]
        });

        res.json({
            code: 200,
            message: "Success",
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [GET] /api/v1/orders/:id
export const getOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findOne({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { id: isNaN(id) ? null : id },
                    { code: id }
                ]
            },
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'slug', 'thumbnail']
                        }
                    ]
                },
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name', 'address', 'contact']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email', 'phone']
                }
            ]
        });

        if (!order) {
            return res.status(404).json({
                code: 404,
                message: "Order not found"
            });
        }

        res.json({
            code: 200,
            message: "Success",
            data: order
        });

    } catch (error) {
        console.error('Get Order Detail Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};
