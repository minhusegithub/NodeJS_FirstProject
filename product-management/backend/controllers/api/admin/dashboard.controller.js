import Product from '../../../models/product.model.js';
import Order from '../../../models/order.model.js';
import User from '../../../models/user.model.js';

// [GET] /api/v1/admin/dashboard
export const index = async (req, res) => {
    try {
        // Products statistics
        const totalProducts = await Product.countDocuments({ deleted: false });
        const activeProducts = await Product.countDocuments({ status: 'active', deleted: false });
        const inactiveProducts = await Product.countDocuments({ status: 'inactive', deleted: false });

        // Low stock products
        const lowStockProducts = await Product.countDocuments({
            deleted: false,
            stock: { $lt: 10 }
        });

        // Orders statistics
        const totalOrders = await Order.countDocuments({ deleted: false });
        const pendingOrders = await Order.countDocuments({ status: 'pending', deleted: false });
        const deliveredOrders = await Order.countDocuments({ status: 'delivered', deleted: false });

        // Revenue statistics
        const revenueResult = await Order.aggregate([
            { $match: { status: 'delivered', deleted: false } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Monthly revenue (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    status: 'delivered',
                    deleted: false,
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$totalPrice' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Users statistics
        const totalUsers = await User.countDocuments({ deleted: false });
        const activeUsers = await User.countDocuments({ status: 'active', deleted: false });

        // Recent orders
        const recentOrders = await Order
            .find({ deleted: false })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('_id userInfo totalPrice status createdAt');

        // Top selling products
        const topProducts = await Order.aggregate([
            { $match: { status: 'delivered', deleted: false } },
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.product_id',
                    title: { $first: '$products.title' },
                    totalSold: { $sum: '$products.quantity' },
                    revenue: {
                        $sum: {
                            $multiply: [
                                '$products.quantity',
                                {
                                    $multiply: [
                                        '$products.price',
                                        { $divide: [{ $subtract: [100, '$products.discountPercentage'] }, 100] }
                                    ]
                                }
                            ]
                        }
                    }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            success: true,
            data: {
                products: {
                    total: totalProducts,
                    active: activeProducts,
                    inactive: inactiveProducts,
                    lowStock: lowStockProducts
                },
                orders: {
                    total: totalOrders,
                    pending: pendingOrders,
                    delivered: deliveredOrders
                },
                revenue: {
                    total: totalRevenue,
                    monthly: monthlyRevenue
                },
                users: {
                    total: totalUsers,
                    active: activeUsers
                },
                recentOrders,
                topProducts
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
