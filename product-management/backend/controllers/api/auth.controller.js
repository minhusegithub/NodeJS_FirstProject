import md5 from 'md5';
import { User, Store, StoreStaff, Role, sequelize } from '../../models/sequelize/index.js'; // Sequelize models
import * as jwtHelper from '../../config/jwt.js';
import * as generateHelper from '../../helpers/generate.js';

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
        const roles = user.store_roles ? user.store_roles.map(r => ({
            storeId: r.store_id,
            storeName: r.store?.name,
            roleId: r.role_id,
            roleName: r.role_data?.name,
            permissions: r.role_data?.permissions || []
        })) : [];

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
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        const decoded = jwtHelper.verifyRefreshToken(refreshToken);
        const newAccessToken = jwtHelper.generateAccessToken({ userId: decoded.userId });

        res.json({
            success: true,
            data: { accessToken: newAccessToken }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

// [POST] /api/v1/auth/logout
export const logout = async (req, res) => {
    try {
        if (req.user) {
            // req.user is populated by middleware (Sequelize instance)
            req.user.status_online = 'offline';
            await req.user.save();
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
