import {
    Order,
    OrderItem,
    Product,
    ProductStoreInventory,
    Store,
    User,
    sequelize
} from '../../models/sequelize/index.js';

// [GET] /api/v1/orders
// Get orders for current authenticated user
export const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 5, status } = req.query;
        const offset = (page - 1) * limit;

        const userId = req.user.id;

        const where = { user_id: userId };
        if (status) {
            where.status = status;
        }

        const { count, rows } = await Order.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name', 'code']
                },
                {
                    model: OrderItem,
                    as: 'items',
                    attributes: ['id', 'title', 'quantity', 'price_new', 'total_price', 'thumbnail']
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



// [PATCH] /api/v1/orders/:id/cancel
export const cancelOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find order and ensure it belongs to this user
        const order = await Order.findOne({
            where: { id, user_id: userId },
            include: [
                {
                    model: OrderItem,
                    as: 'items'
                }
            ],
            transaction: t
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ code: 404, message: 'Không tìm thấy đơn hàng' });
        }

        // Only allow cancellation for pending or confirmed orders
        if (!['pending', 'confirmed'].includes(order.status)) {
            await t.rollback();
            return res.status(400).json({
                code: 400,
                message: 'Chỉ có thể hủy đơn hàng ở trạng thái "Chờ xác nhận" hoặc "Đã xác nhận"'
            });
        }

        // Restore stock for each item
        for (const item of order.items) {
            const inventory = await ProductStoreInventory.findOne({
                where: { product_id: item.product_id, store_id: order.store_id },
                transaction: t
            });
            if (inventory) {
                await inventory.increment('stock', { by: item.quantity, transaction: t });
            }
        }

        // Update order status
        await order.update({ status: 'cancelled' }, { transaction: t });

        await t.commit();

        res.json({
            code: 200,
            message: 'Đã hủy đơn hàng thành công',
            data: { order }
        });
    } catch (error) {
        await t.rollback();
        console.error('Cancel Order Error:', error);
        res.status(500).json({ code: 500, message: 'Lỗi server: ' + error.message });
    }
};

