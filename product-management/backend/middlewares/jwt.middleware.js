import jwt from 'jsonwebtoken';
import * as jwtHelper from '../config/jwt.js';
import { User, StoreStaff, Store, Role } from '../models/sequelize/index.js'; // Use Sequelize model
import { isRedisReady, redisGet, redisSet } from '../config/redis.js';

// TTL cache user session = thời gian sống access token (15 phút)
const USER_SESSION_TTL = 60 * 15;
const SESSION_KEY = (userId) => `user:session:${userId}`;

/**
 * Tải user từ Redis cache. Nếu miss → query DB + lưu vào cache.
 * @returns {object|null} user object (plain object, không phải Sequelize instance)
 */
const loadUserWithCache = async (userId) => {
    // 1. Thử cache
    if (isRedisReady()) {
        const cached = await redisGet(SESSION_KEY(userId));
        if (cached) {
            return JSON.parse(cached);
        }
    }

    // 2. Cache miss → query DB (4-table JOIN)
    const user = await User.findByPk(userId, {
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

    if (!user) return null;

    // Convert sang plain object để JSON-serializable
    const plainUser = user.get({ plain: true });
    plainUser.roles = plainUser.store_roles?.map(sr => ({
        roleName: sr.role_data?.name,
        storeId: sr.store_id,
        store: sr.store
    })) || [];

    // 3. Lưu vào Redis
    await redisSet(SESSION_KEY(userId), JSON.stringify(plainUser), USER_SESSION_TTL);

    return plainUser;
};

// ---------------------------------------------------------------------------
// Middleware dùng riêng cho logout: cho phép token hết hạn vẫn đi qua
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Middleware xác thực user thông thường
// ---------------------------------------------------------------------------
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

        // Kiểm tra token có bị blacklist không (logout tức thì)
        const blacklisted = await jwtHelper.isTokenBlacklisted(decoded.jti);
        if (blacklisted) {
            return res.status(401).json({
                success: false,
                message: 'Token has been revoked'
            });
        }

        // Tải user từ cache hoặc DB
        const user = await loadUserWithCache(decoded.userId);

        if (!user || user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or User inactive'
            });
        }

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

// ---------------------------------------------------------------------------
// Middleware xác thực admin
// ---------------------------------------------------------------------------
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

        // Kiểm tra token có bị blacklist không
        const blacklisted = await jwtHelper.isTokenBlacklisted(decoded.jti);
        if (blacklisted) {
            return res.status(401).json({
                success: false,
                message: 'Token has been revoked'
            });
        }

        // Tải user từ cache hoặc DB
        const user = await loadUserWithCache(decoded.userId);

        if (!user || user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or User inactive'
            });
        }

        // Kiểm tra quyền admin
        const hasAdminRole = user.store_roles?.some(sr =>
            sr.role_data?.name === 'admin' || sr.role_data?.name === 'super_admin'
        );

        if (!hasAdminRole) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

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


// Middleware dùng riêng cho logout: cho phép token hết hạn vẫn đi qua
