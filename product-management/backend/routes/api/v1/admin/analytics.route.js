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

// Fulfillment official reports (SystemAdmin & storeManager)
router.get('/fulfillment', requireRole(['SystemAdmin', 'storeManager']), analyticsController.getFulfillmentReports);

// Fulfillment SLA what-if simulation (SystemAdmin & storeManager)
router.get('/fulfillment/simulate', requireRole(['SystemAdmin', 'storeManager']), analyticsController.simulateSlaCompliance);

export default router;
