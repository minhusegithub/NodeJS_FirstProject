import express from 'express';
import * as orderController from '../../../controllers/api/order.controller.js';
import * as checkoutController from '../../../controllers/api/checkout.controller.js';
import { authenticateUser } from '../../../middlewares/jwt.middleware.js';

const router = express.Router();

// Checkout API (processes cart and creates orders)
router.post('/checkout', authenticateUser, checkoutController.checkout);

// VNPay return URL (no auth required as it's a callback)
router.get('/vnpay-return', checkoutController.vnpayReturn);

// Order Management API
router.get('/', authenticateUser, orderController.getOrders); // GET /api/v1/orders
router.patch('/:id/cancel', authenticateUser, orderController.cancelOrder); // PATCH /api/v1/orders/:id/cancel

export default router;
