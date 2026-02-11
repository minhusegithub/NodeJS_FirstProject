import {
    Order,
    OrderItem,
    Product,
    Store,
    User,
    sequelize
} from '../../../models/sequelize/index.js';
import { Op } from 'sequelize';

// [GET] /api/v1/admin/orders
// Get orders for stores managed by current user
export const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, keyword } = req.query;
        const offset = (page - 1) * limit;

        const userId = req.user.id;
        const userRoles = req.user.roles || [];

        console.log('🔍 Admin Orders - User ID:', userId);
        console.log('🔍 Admin Orders - User Roles:', userRoles.map(r => r.roleName));

        // Get stores managed by this user
        const managedStores = await Store.findAll({
            where: {
                manager_id: userId
            },
            attributes: ['id']
        });

        console.log('🔍 Admin Orders - Managed Stores:', managedStores.map(s => s.id));

        const storeIds = managedStores.map(s => s.id);

        if (storeIds.length === 0) {
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
        const where = {
            store_id: { [Op.in]: storeIds }
        };

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
        console.error('Get Admin Orders Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [GET] /api/v1/admin/orders/:id
export const getOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get stores managed by this user
        const managedStores = await Store.findAll({
            where: {
                manager_id: userId
            },
            attributes: ['id']
        });

        const storeIds = managedStores.map(s => s.id);

        const order = await Order.findOne({
            where: {
                [Op.or]: [
                    { id: isNaN(id) ? null : id },
                    { code: id }
                ],
                store_id: { [Op.in]: storeIds }
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
                    attributes: ['id', 'name', 'code', 'address', 'contact']
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
                message: "Order not found or you don't have permission"
            });
        }

        res.json({
            code: 200,
            message: "Success",
            data: order
        });

    } catch (error) {
        console.error('Get Admin Order Detail Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// [PATCH] /api/v1/admin/orders/:id/status
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid status'
            });
        }

        // Get stores managed by this user
        const managedStores = await Store.findAll({
            where: {
                manager_id: userId
            },
            attributes: ['id']
        });

        const storeIds = managedStores.map(s => s.id);

        const order = await Order.findOne({
            where: {
                id,
                store_id: { [Op.in]: storeIds }
            }
        });

        if (!order) {
            return res.status(404).json({
                code: 404,
                message: "Order not found or you don't have permission"
            });
        }

        await order.update({ status });

        res.json({
            code: 200,
            message: "Order status updated successfully",
            data: order
        });

    } catch (error) {
        console.error('Update Order Status Error:', error);
        res.status(500).json({
            code: 500,
            message: "Internal Server Error",
            error: error.message
        });
    }
};
