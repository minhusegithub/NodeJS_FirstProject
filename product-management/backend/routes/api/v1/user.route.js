import express from 'express';
import * as userController from '../../../controllers/api/user.controller.js';
import { authenticateUser } from '../../../middlewares/jwt.middleware.js';

const router = express.Router();

router.get('/profile', authenticateUser, userController.getProfile);
router.patch('/info', authenticateUser, userController.updateInfo);

export default router;
