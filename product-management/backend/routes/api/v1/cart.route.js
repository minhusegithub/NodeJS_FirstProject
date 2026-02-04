import express from 'express';
import * as cartController from '../../../controllers/api/cart.controller.js';
import { authenticateUser } from '../../../middlewares/jwt.middleware.js';

const router = express.Router();

router.get('/', authenticateUser, cartController.getCart);
router.post('/add', authenticateUser, cartController.addToCart);
router.patch('/update', authenticateUser, cartController.updateCartItem);
router.delete('/remove/:id', authenticateUser, cartController.removeCartItem);
router.delete('/clear', authenticateUser, cartController.clearCart);

export default router;
