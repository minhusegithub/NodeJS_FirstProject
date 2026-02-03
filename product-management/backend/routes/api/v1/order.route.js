import express from 'express';
import * as orderController from '../../../controllers/api/order.controller.js';
import { authenticateUser } from '../../../middlewares/jwt.middleware.js';

const router = express.Router();

router.post('/checkout', authenticateUser, orderController.checkout);
router.get('/', authenticateUser, orderController.getOrders);
router.get('/:id', authenticateUser, orderController.getOrderDetail);
router.patch('/:id/cancel', authenticateUser, orderController.cancelOrder);

export default router;
