import md5 from 'md5';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, Store, StoreStaff, Role, sequelize } from '../../models/sequelize/index.js'; // Sequelize models
import * as jwtHelper from '../../config/jwt.js';
import * as generateHelper from '../../helpers/generate.js';
import { redisDel } from '../../config/redis.js';
import { sendMail } from '../../helpers/sendMailESM.js';

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

// [POST] /api/v1/auth/forgot-password
// Bước 1: Nhận email, sinh OTP 6 số, gửi email
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email là bắt buộc!' });
        }

        // Luôn trả về thành công dù email không tồn tại (tránh lộ thông tin user)
        const user = await User.findOne({ where: { email }, paranoid: true });

        if (user) {
            // Sinh OTP 6 số ngẫu nhiên bảo mật
            const otp = crypto.randomInt(100000, 999999).toString();
            const otpExpire = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút

            // Lưu OTP vào DB
            user.reset_password_otp = otp;
            user.otp_expire = otpExpire;
            user.reset_password_token = null; // Xóa token cũ nếu có
            await user.save();

            // Template email HTML
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;">
                    <h2 style="color: #4F46E5; text-align: center;">🔐 Đặt lại mật khẩu</h2>
                    <p style="color: #333;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                    <p style="color: #333;">Mã xác thực OTP của bạn là:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #4F46E5;">${otp}</span>
                    </div>
                    <p style="color: #666; font-size: 14px;">⏱ Mã này sẽ hết hạn sau <strong>5 phút</strong>.</p>
                    <p style="color: #666; font-size: 14px;">Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin-top: 24px;"/>
                    <p style="color: #aaa; font-size: 12px; text-align: center;">© 2025 MVN Shop Management</p>
                </div>
            `;

            await sendMail(
                email,
                '🔑 Mã OTP đặt lại mật khẩu',
                html
            );
        }

        // Trả về thành công bất kể email có tồn tại hay không (security best practice)
        return res.json({
            success: true,
            message: 'Nếu email hợp lệ, mã OTP đã được gửi. Vui lòng kiểm tra hộp thư của bạn.'
        });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
    }
};

// [POST] /api/v1/auth/verify-otp
// Bước 2: Xác thực OTP, trả về resetToken (JWT ngắn hạn) để cho phép đổi mật khẩu
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email và mã OTP là bắt buộc!' });
        }

        const user = await User.findOne({
            where: { email },
            paranoid: true
        });

        // Kiểm tra user, OTP có tồn tại, có khớp, và còn hạn
        if (
            !user ||
            !user.reset_password_otp ||
            !user.otp_expire ||
            user.reset_password_otp !== otp.toString() ||
            new Date() > new Date(user.otp_expire)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Mã OTP không hợp lệ hoặc đã hết hạn!'
            });
        }

        // OTP hợp lệ → xóa OTP cũ, sinh resetToken (JWT ngắn hạn 5 phút)
        const resetToken = jwt.sign(
            { userId: user.id, purpose: 'reset_password' },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '5m' }
        );

        // Lưu resetToken vào DB và xóa OTP
        user.reset_password_otp = null;
        user.otp_expire = null;
        user.reset_password_token = resetToken;
        await user.save();

        return res.json({
            success: true,
            message: 'Xác thực OTP thành công!',
            data: { resetToken }
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
    }
};

// [POST] /api/v1/auth/reset-password
// Bước 3: Nhận resetToken + mật khẩu mới, cập nhật DB
export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ success: false, message: 'Token và mật khẩu mới là bắt buộc!' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu tối thiểu 6 ký tự!' });
        }

        // Xác thực JWT resetToken
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_ACCESS_SECRET);
        } catch {
            return res.status(400).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
        }

        // Kiểm tra purpose đúng mục đích reset password
        if (decoded.purpose !== 'reset_password') {
            return res.status(400).json({ success: false, message: 'Token không hợp lệ!' });
        }

        // Tìm user và kiểm tra token khớp trong DB (chống replay attack)
        const user = await User.findOne({
            where: { id: decoded.userId, reset_password_token: resetToken },
            paranoid: true
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Token không hợp lệ hoặc đã được sử dụng!' });
        }

        // Cập nhật mật khẩu mới và xóa resetToken
        user.password = md5(newPassword);
        user.reset_password_token = null;
        await user.save();

        return res.json({
            success: true,
            message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.'
        });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
    }
};
