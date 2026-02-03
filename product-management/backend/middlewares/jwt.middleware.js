import * as jwtHelper from '../config/jwt.js';
import User from '../models/user.model.js';
import Account from '../models/account.model.js';

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
        const user = await User.findById(decoded.userId).select('-password');

        if (!user || user.deleted) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        req.user = user;
        next();
    } catch (error) {
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
        const account = await Account.findById(decoded.accountId).select('-password');

        if (!account || account.deleted) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        req.account = account;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};
