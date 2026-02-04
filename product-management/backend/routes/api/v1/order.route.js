import express from 'express';
import * as orderController from '../../../controllers/api/order.controller.js';
import { authenticateUser } from '../../../middlewares/jwt.middleware.js';

const router = express.Router();

// New Order API for Multi-store
router.post('/', authenticateUser, orderController.createOrder); // POST /api/v1/orders
router.get('/', authenticateUser, orderController.getOrders); // GET /api/v1/orders
router.get('/:id', authenticateUser, orderController.getOrderDetail); // GET /api/v1/orders/:id

// TODO: Cancel logic can be moved to update status API if needed
// router.patch('/:id/cancel', authenticateUser, orderController.cancelOrder);

export default router;
