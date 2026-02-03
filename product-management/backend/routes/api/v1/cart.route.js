import express from 'express';
import * as cartController from '../../../controllers/api/cart.controller.js';
import { authenticateUser } from '../../../middlewares/jwt.middleware.js';

const router = express.Router();

router.get('/', authenticateUser, cartController.index);
router.post('/add', authenticateUser, cartController.addToCart);
router.patch('/update', authenticateUser, cartController.updateQuantity);
router.delete('/delete/:productId', authenticateUser, cartController.deleteItem);

export default router;
