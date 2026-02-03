import express from 'express';
import * as productController from '../../../controllers/api/product.controller.js';

const router = express.Router();

router.get('/', productController.index);
router.get('/featured', productController.featured);
router.get('/:slug', productController.detail);

export default router;
