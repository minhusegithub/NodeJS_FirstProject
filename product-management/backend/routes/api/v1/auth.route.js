import express from 'express';
import * as authController from '../../../controllers/api/auth.controller.js';
import { authenticateUser, authenticateForLogout } from '../../../middlewares/jwt.middleware.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticateForLogout, authController.logout);
router.get('/profile', authenticateUser, authController.profile);

export default router;
