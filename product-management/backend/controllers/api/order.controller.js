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
        const { page = 1, limit = 10, status } = req.query;
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
