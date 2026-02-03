import express from 'express';
import * as orderController from '../../../../controllers/api/admin/order.controller.js';

const router = express.Router();

router.get('/statistics', orderController.statistics);
router.get('/', orderController.index);
router.get('/:id', orderController.detail);
router.patch('/:id/status', orderController.updateStatus);
router.delete('/:id', orderController.deleteOrder);

export default router;
