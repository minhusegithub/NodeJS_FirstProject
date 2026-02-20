import express from 'express';
import * as userController from '../../../controllers/api/user.controller.js';
import { authenticateUser } from '../../../middlewares/jwt.middleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/profile', authenticateUser, userController.getProfile);
router.patch('/info', authenticateUser, upload.single('avatar'), userController.updateInfo);

export default router;
