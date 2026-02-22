import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { BlacklistedToken } from '../models/sequelize/index.js';
import { Op } from 'sequelize';

export const generateAccessToken = (payload) => {
    return jwt.sign(
        {
            ...payload,
            jti: crypto.randomUUID() // Add unique JWT ID
        },
        process.env.JWT_ACCESS_SECRET ,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
        }
    );
};

export const generateRefreshToken = (payload) => {
    return jwt.sign(
        {
            ...payload,
            jti: crypto.randomUUID() // Add unique JWT ID
        },
        process.env.JWT_REFRESH_SECRET ,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
        }
    );
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET );
};

// Helper to set refresh token in HttpOnly cookie
export const setRefreshTokenCookie = (res, token) => {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

// Check if token is blacklisted
export const isTokenBlacklisted = async (jti) => {
    const blacklisted = await BlacklistedToken.findOne({
        where: { jti }
    });
    return !!blacklisted;
};

// Add token to blacklist
export const blacklistToken = async (token, userId, tokenType = 'refresh', reason = 'logout') => {
    try {
        const decoded = tokenType === 'refresh' 
            ? verifyRefreshToken(token) 
            : verifyAccessToken(token);

        await BlacklistedToken.create({
            jti: decoded.jti,
            user_id: userId,
            token_type: tokenType,
            expires_at: new Date(decoded.exp * 1000),
            reason: reason
        });

        return true;
    } catch (error) {
        console.error('Error blacklisting token:', error);
        return false;
    }
};

// Clean up expired blacklisted tokens (should be run periodically via cron job)
export const cleanupExpiredTokens = async () => {
    try {
        const result = await BlacklistedToken.destroy({
            where: {
                expires_at: {
                    [Op.lt]: new Date()
                }
            }
        });
        console.log(`Cleaned up ${result} expired blacklisted tokens`);
        return result;
    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
        return 0;
    }
};
