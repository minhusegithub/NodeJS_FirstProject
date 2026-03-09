import express from 'express';
import * as analyticsController from '../../../../controllers/api/admin/analytics.controller.js';
import { requireRole } from '../../../../middlewares/role.middleware.js';

const router = express.Router();

// Revenue overview + trend (SystemAdmin & storeManager)
router.get('/', requireRole(['SystemAdmin', 'storeManager']), analyticsController.getRevenueOverview);

// Store performance comparison (SystemAdmin only)
router.get('/store-performance', requireRole(['SystemAdmin']), analyticsController.getStorePerformance);

// Best selling products (SystemAdmin & storeManager)
router.get('/best-sellers', requireRole(['SystemAdmin', 'storeManager']), analyticsController.getBestSellers);

// Dead stock analysis (SystemAdmin & storeManager)
router.get('/dead-stock', requireRole(['SystemAdmin', 'storeManager']), analyticsController.getDeadStock);

export default router;
