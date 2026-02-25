import md5 from 'md5';
import { User, Store, StoreStaff, Role, sequelize } from '../../models/sequelize/index.js'; // Sequelize models
import * as jwtHelper from '../../config/jwt.js';
import * as generateHelper from '../../helpers/generate.js';
import { redisDel } from '../../config/redis.js';

// Helper: fetch user with roles (reused in login & refresh)
const fetchUserWithRoles = (userId) => User.findByPk(userId, {
    paranoid: true,
    include: [
        {
            model: StoreStaff,
            as: 'store_roles',
            where: { is_active: true },
            required: false,
            include: [
                { model: Store, as: 'store', attributes: ['id', 'name', 'code'] },
                { model: Role, as: 'role_data' }
            ]
        }
    ]
});

// Helper: map store_roles → roles array
const mapRoles = (storeRoles = []) => storeRoles.map(r => ({
    storeId: r.store_id,
    storeName: r.store?.name,
    roleId: r.role_id,
    roleName: r.role_data?.name,
    permissions: r.role_data?.permissions || []
}));

// [POST] /api/v1/auth/register
export const register = async (req, res) => {
    try {
        const { email, password, fullName, phone } = req.body;

        const existingUser = await User.findOne({
            where: { email },
            paranoid: true // Exclude soft-deleted
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã tồn tại!'
            });
        }

        const newUser = await User.create({
            email,
            password: md5(password),
            full_name: fullName,
            phone,
            token_user: generateHelper.generateRandomString(20),
            status: 'active'
        });

        const accessToken = jwtHelper.generateAccessToken({ userId: newUser.id });
        const refreshToken = jwtHelper.generateRefreshToken({ userId: newUser.id });

        // Set refresh token in HttpOnly cookie
        jwtHelper.setRefreshTokenCookie(res, refreshToken);

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    fullName: newUser.full_name,
                    phone: newUser.phone
                },
                accessToken
            }
        });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [POST] /api/v1/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({
            where: { email },
            paranoid: true,
            include: [
                {
                    model: StoreStaff,
                    as: 'store_roles',
                    where: { is_active: true },
                    required: false,
                    include: [
                        { model: Store, as: 'store', attributes: ['id', 'name', 'code'] },
                        { model: Role, as: 'role_data' }
                    ]
                }
            ]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email không tồn tại!'
            });
        }

        if (md5(password) !== user.password) {
            return res.status(401).json({
                success: false,
                message: 'Sai mật khẩu!'
            });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đang bị khóa!'
            });
        }

        // Prepare Roles Data
        const roles = mapRoles(user.store_roles);

        const accessToken = jwtHelper.generateAccessToken({
            userId: user.id,
            roles: roles // Embed full roles & permissions
        });
        const refreshToken = jwtHelper.generateRefreshToken({ userId: user.id });

        // Set refresh token in HttpOnly cookie
        jwtHelper.setRefreshTokenCookie(res, refreshToken);

        // Update user status to online
        user.status_online = 'online';
        await user.save();

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    phone: user.phone,
                    avatar: user.avatar,
                    address: user.address,
                    roles: roles
                },
                accessToken
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [POST] /api/v1/auth/refresh-token
export const refreshToken = async (req, res) => {
    const incomingRT = req.cookies.refreshToken;

    if (!incomingRT) {
        return res.status(401).json({
            success: false,
            code: 'NO_REFRESH_TOKEN',
            message: 'Refresh token required'
        });
    }

    // Verify refresh token signature & expiration
    let decoded;
    try {
        decoded = jwtHelper.verifyRefreshToken(incomingRT);
    } catch (err) {
        // Token giả hoặc đã hết hạn → xóa cookie, force logout
        res.clearCookie('refreshToken');
        return res.status(401).json({
            success: false,
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token'
        });
    }

    // =====================================================================
    // REUSE DETECTION: RT đã bị blacklist mà vẫn được dùng lại → THEFT
    // =====================================================================
    const alreadyBlacklisted = decoded.jti && await jwtHelper.isTokenBlacklisted(decoded.jti);
    if (alreadyBlacklisted) {
        // Invalidate user session cache để force re-auth mọi thiết bị
        await redisDel(`user:session:${decoded.userId}`);
        res.clearCookie('refreshToken');
        return res.status(401).json({
            success: false,
            code: 'REUSE_DETECTED',
            message: 'Security violation detected. Please login again.'
        });
    }

    // Fetch user with fresh roles
    const user = await fetchUserWithRoles(decoded.userId);

    if (!user || user.status === 'inactive') {
        res.clearCookie('refreshToken');
        return res.status(401).json({
            success: false,
            code: 'USER_INACTIVE',
            message: 'User not found or inactive'
        });
    }

    const roles = mapRoles(user.store_roles);

    // =====================================================================
    // ROTATE: Blacklist RT cũ → generate AT mới + RT mới
    // =====================================================================
    await jwtHelper.blacklistToken(incomingRT, decoded.userId, 'refresh', 'rotation');

    const newAccessToken = jwtHelper.generateAccessToken({ userId: decoded.userId, roles });
    const newRefreshToken = jwtHelper.generateRefreshToken({ userId: decoded.userId });

    // Set RT mới vào HttpOnly cookie
    jwtHelper.setRefreshTokenCookie(res, newRefreshToken);

    // Invalidate cache cũ để middleware load lại data mới nhất
    await redisDel(`user:session:${decoded.userId}`);

    return res.json({
        success: true,
        data: {
            accessToken: newAccessToken,
            // Trả kèm user data → frontend không cần gọi thêm /auth/profile
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                phone: user.phone,
                avatar: user.avatar,
                address: user.address,
                roles
            }
        }
    });
};

// [POST] /api/v1/auth/logout
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (req.user) {
            // Invalidate user session cache
            await redisDel(`user:session:${req.user.id}`);

            req.user.status_online = 'offline';
            await req.user.save();

            // Blacklist the refresh token
            if (refreshToken) {
                await jwtHelper.blacklistToken(refreshToken, req.user.id, 'refresh', 'logout');
            }
        }

        res.clearCookie('refreshToken');
        res.json({
            success: true,
            message: 'Đăng xuất thành công!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// [GET] /api/v1/auth/profile
export const profile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        // Map roles from req.user.store_roles (populated by authenticateUser middleware)
        const roles = req.user.store_roles ? req.user.store_roles.map(r => ({
            storeId: r.store_id,
            storeName: r.store?.name,
            roleId: r.role_id,
            roleName: r.role_data?.name,
            permissions: r.role_data?.permissions || []
        })) : [];

        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    fullName: req.user.full_name,
                    phone: req.user.phone,
                    avatar: req.user.avatar,
                    address: req.user.address,
                    status: req.user.status,
                    roles: roles
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
