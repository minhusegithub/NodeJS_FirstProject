import * as jwtHelper from '../config/jwt.js';
import { User, StoreStaff, Store, Role } from '../models/sequelize/index.js'; // Use Sequelize model

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
