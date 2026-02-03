import Order from '../../../models/order.model.js';

// [GET] /api/v1/admin/orders
export const index = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status = '',
            keyword = '',
            sortKey = 'createdAt',
            sortValue = 'desc'
        } = req.query;

        const find = { deleted: false };

        // Filter by status
        if (status) {
            find.status = status;
        }

        // Search by order ID or user info
        if (keyword) {
            const regex = new RegExp(keyword, 'i');
            find.$or = [
                { 'userInfo.fullName': regex },
                { 'userInfo.phone': regex },
                { 'userInfo.email': regex }
            ];
        }

        // Sorting
        const sort = {};
        sort[sortKey] = sortValue === 'asc' ? 1 : -1;

        // Pagination
        const skip = (page - 1) * limit;
        const total = await Order.countDocuments(find);
        const totalPages = Math.ceil(total / limit);

        const orders = await Order
            .find(find)
            .sort(sort)
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

// [GET] /api/v1/admin/orders/:id
export const detail = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);

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

// [PATCH] /api/v1/admin/orders/:id/status
export const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ!'
            });
        }

        const order = await Order.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng!'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công!',
            data: { order }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [DELETE] /api/v1/admin/orders/:id
export const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findByIdAndUpdate(
            id,
            { deleted: true },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng!'
            });
        }

        res.json({
            success: true,
            message: 'Xóa đơn hàng thành công!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [GET] /api/v1/admin/orders/statistics
export const statistics = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments({ deleted: false });
        const pendingOrders = await Order.countDocuments({ status: 'pending', deleted: false });
        const confirmedOrders = await Order.countDocuments({ status: 'confirmed', deleted: false });
        const shippingOrders = await Order.countDocuments({ status: 'shipping', deleted: false });
        const deliveredOrders = await Order.countDocuments({ status: 'delivered', deleted: false });
        const cancelledOrders = await Order.countDocuments({ status: 'cancelled', deleted: false });

        // Calculate total revenue (delivered orders only)
        const revenueResult = await Order.aggregate([
            { $match: { status: 'delivered', deleted: false } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        res.json({
            success: true,
            data: {
                totalOrders,
                pendingOrders,
                confirmedOrders,
                shippingOrders,
                deliveredOrders,
                cancelledOrders,
                totalRevenue
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
