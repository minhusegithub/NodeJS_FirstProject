import express from 'express';
import * as controller from '../../../controllers/api/product.controller.js';

const router = express.Router();

// Public routes (no auth required for viewing products)
router.get('/', controller.getProducts);
router.get('/categories/tree', controller.getCategoryTree);
router.get('/:id', controller.getProductDetail);

export default router;
