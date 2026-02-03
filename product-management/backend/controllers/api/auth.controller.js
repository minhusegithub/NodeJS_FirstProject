import md5 from 'md5';
import User from '../../models/user.model.js';
import * as jwtHelper from '../../config/jwt.js';
import * as generateHelper from '../../helpers/generate.js';

// [POST] /api/v1/auth/register
export const register = async (req, res) => {
    try {
        const { email, password, fullName, phone } = req.body;

        const existingUser = await User.findOne({ email, deleted: false });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã tồn tại!'
            });
        }

        const user = new User({
            email,
            password: md5(password),
            fullName,
            phone,
            tokenUser: generateHelper.generateRandomString(20)
        });

        await user.save();

        const accessToken = jwtHelper.generateAccessToken({ userId: user._id });
        const refreshToken = jwtHelper.generateRefreshToken({ userId: user._id });

        // Set refresh token in HttpOnly cookie
        jwtHelper.setRefreshTokenCookie(res, refreshToken);

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    phone: user.phone
                },
                accessToken
            }
        });
    } catch (error) {
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

        const user = await User.findOne({ email, deleted: false });

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

        const accessToken = jwtHelper.generateAccessToken({ userId: user._id });
        const refreshToken = jwtHelper.generateRefreshToken({ userId: user._id });

        // Set refresh token in HttpOnly cookie
        jwtHelper.setRefreshTokenCookie(res, refreshToken);

        // Update user status to online
        await User.updateOne({ _id: user.id }, { statusOnline: 'online' });

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    phone: user.phone,
                    avatar: user.avatar,
                    address: user.address
                },
                accessToken
            }
        });
    } catch (error) {
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
            await User.updateOne({ _id: req.user.id }, { statusOnline: 'offline' });
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
        res.json({
            success: true,
            data: {
                user: {
                    id: req.user._id,
                    email: req.user.email,
                    fullName: req.user.fullName,
                    phone: req.user.phone,
                    avatar: req.user.avatar,
                    address: req.user.address,
                    status: req.user.status
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
