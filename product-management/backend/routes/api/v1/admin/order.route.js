import express from 'express';
import * as orderController from '../../../../controllers/api/admin/order.controller.js';
import { requireRole } from '../../../../middlewares/role.middleware.js';

const router = express.Router();

// All routes require storeManager or OrderStaff role
router.use(requireRole(['storeManager', 'OrderStaff']));

router.get('/', orderController.getOrders);

router.patch('/:id/status', orderController.updateOrderStatus);

export default router;
