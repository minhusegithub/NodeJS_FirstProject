import express from 'express';
import * as productController from '../../../../controllers/api/admin/product.controller.js';

const router = express.Router();

router.get('/', productController.index);
router.get('/:id', productController.detail);
router.post('/', productController.create);
router.patch('/:id', productController.update);
router.delete('/:id', productController.deleteProduct);
router.patch('/change-status/:id', productController.changeStatus);
router.patch('/change-multi', productController.changeMulti);

export default router;
