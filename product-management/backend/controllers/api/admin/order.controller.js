import {
    Order,
    OrderItem,
    Product,
    ProductStoreInventory,
    Store,
    User,
    sequelize
} from '../../../models/sequelize/index.js';
import { Op } from 'sequelize';

// Helper to get allowed store IDs for the current user
const getAllowedStoreIds = (user) => {
    const roles = user.roles || [];
    // If SystemAdmin, allow all stores (return null)
    if (roles.some(r => r.roleName === 'SystemAdmin')) {
        return null;
    }

    // Get store IDs from roles (derived from StoreStaff)
    // This answers "who has what role at which store"
    const storeIds = roles.map(r => r.storeId).filter(id => id);

    return [...new Set(storeIds)];
};

// [GET] /api/v1/admin/orders
// Get orders for stores managed by current user
export const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, keyword } = req.query;
        const offset = (page - 1) * limit;

        const allowedStoreIds = await getAllowedStoreIds(req.user);

        // If not admin and no stores assigned, return empty
        if (allowedStoreIds !== null && allowedStoreIds.length === 0) {
            return res.json({
                code: 200,
                message: "Success",
                data: [],
                pagination: {
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: 0
                }
            });
        }

        // Build where clause
        const where = {};

        // If not system admin, filter by allowed stores
        if (allowedStoreIds !== null) {
            where.store_id = { [Op.in]: allowedStoreIds };
        }

        if (status) {
            where.status = status;
        }

        if (keyword) {
            where[Op.or] = [
                { code: { [Op.iLike]: `%${keyword}%` } },
                sequelize.where(
                    sequelize.cast(sequelize.col('user_info'), 'text'),
                    { [Op.iLike]: `%${keyword}%` }
                )
            ];
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
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email', 'phone']
                },
                {
                    model: OrderItem,
                    as: 'items',
                    attributes: ['id', 'title', 'quantity', 'price_new', 'total_price', 'thumbnail']
                }
            ],
            distinct: true // Important for correct count with includes
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
        console.error('Get Admin Orders Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};



// [PATCH] /api/v1/admin/orders/:id/status
export const updateOrderStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            await t.rollback();
            return res.status(400).json({
                code: 400,
                message: 'Invalid status'
            });
        }

        const allowedStoreIds = await getAllowedStoreIds(req.user);

        const where = { id };
        if (allowedStoreIds !== null) {
            where.store_id = { [Op.in]: allowedStoreIds };
        }

        const order = await Order.findOne({
            where,
            include: [{ model: OrderItem, as: 'items' }],
            transaction: t
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({
                code: 404,
                message: "Order not found or you don't have permission"
            });
        }

        // Prevent re-cancelling or restoring already-cancelled orders
        if (order.status === 'cancelled' && status === 'cancelled') {
            await t.rollback();
            return res.status(400).json({ code: 400, message: 'Đơn hàng đã được hủy trước đó' });
        }

        // If cancelling: restore stock for each item
        if (status === 'cancelled' && order.status !== 'cancelled') {
            for (const item of order.items) {
                const inventory = await ProductStoreInventory.findOne({
                    where: { product_id: item.product_id, store_id: order.store_id },
                    transaction: t
                });
                if (inventory) {
                    await inventory.increment('stock', { by: item.quantity, transaction: t });
                }
            }
        }

        await order.update({ status }, { transaction: t });
        await t.commit();

        res.json({
            code: 200,
            message: "Order status updated successfully",
            data: order
        });

    } catch (error) {
        await t.rollback();
        console.error('Update Order Status Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};
