import jwt from 'jsonwebtoken';
import * as jwtHelper from '../config/jwt.js';
import { User, StoreStaff, Store, Role } from '../models/sequelize/index.js'; // Use Sequelize model

// Middleware dùng riêng cho logout: cho phép token hết hạn vẫn đi qua
export const authenticateForLogout = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(); // Không có token → vẫn cho logout (chỉ xóa cookie)
        }

        let userId;
        try {
            const decoded = jwtHelper.verifyAccessToken(token);
            userId = decoded.userId;
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                // Token hết hạn: decode không verify để lấy userId
                const decoded = jwt.decode(token);
                userId = decoded?.userId;
            }
            // Với các lỗi khác (token giả, sai format): bỏ qua, vẫn cho logout
        }

        if (userId) {
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
            if (user) req.user = user;
        }
    } catch (error) {
        // Bất kỳ lỗi DB nào cũng không chặn logout
        console.error('authenticateForLogout error (non-blocking):', error.message);
    }

    return next(); // Luôn cho đi qua
};

export const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwtHelper.verifyAccessToken(token);

        // Use Sequelize findByPk
        const user = await User.findByPk(decoded.userId, {
            attributes: { exclude: ['password'] }, // Sequelize uses exclude
            include: [
                {
                    model: StoreStaff,
                    as: 'store_roles',
                    where: { is_active: true },
                    required: false,
                    include: [
                        { model: Store, as: 'store' },
                        { model: Role, as: 'role_data' }
                    ]
                }
            ]
        });

        // Use paranoid: true so deletedAt check is automatic, but can check explicit
        if (!user || user.status !== 'active') { // Assuming logic
            return res.status(401).json({
                success: false,
                message: 'Invalid token or User inactive'
            });
        }

        // Map store_roles to roles array for compatibility
        user.roles = user.store_roles?.map(sr => ({
            roleName: sr.role_data?.name,
            storeId: sr.store_id,
            store: sr.store
        })) || [];

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

export const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwtHelper.verifyAccessToken(token);

        // Use User model instead of Account (which doesn't exist)
        const user = await User.findByPk(decoded.userId, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: StoreStaff,
                    as: 'store_roles',
                    where: { is_active: true },
                    required: false,
                    include: [
                        { model: Store, as: 'store' },
                        { model: Role, as: 'role_data' }
                    ]
                }
            ]
        });

        if (!user || user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or User inactive'
            });
        }

        // Check if user has admin role
        const hasAdminRole = user.store_roles?.some(sr => 
            sr.role_data?.name === 'admin' || sr.role_data?.name === 'super_admin'
        );

        if (!hasAdminRole) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Map store_roles to roles array for compatibility
        user.roles = user.store_roles?.map(sr => ({
            roleName: sr.role_data?.name,
            storeId: sr.store_id,
            store: sr.store
        })) || [];

        req.user = user;
        next();
    } catch (error) {
        console.error('Admin Auth Middleware Error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};
