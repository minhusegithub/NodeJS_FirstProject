import express from 'express';
import * as authController from '../../../controllers/api/auth.controller.js';
import { authenticateUser, authenticateForLogout } from '../../../middlewares/jwt.middleware.js';
import { loginRateLimiter, registerRateLimiter, forgotPasswordRateLimiter } from '../../../middlewares/rateLimiter.middleware.js';

const router = express.Router();

router.post('/register', registerRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticateForLogout, authController.logout);
router.get('/profile', authenticateUser, authController.profile);

// Forgot Password (3-step OTP flow)
router.post('/forgot-password', forgotPasswordRateLimiter, authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);

export default router;
