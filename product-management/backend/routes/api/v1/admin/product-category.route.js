import express from 'express';
import * as productCategoryController from '../../../../controllers/api/admin/product-category.controller.js';
import { requireRole } from '../../../../middlewares/role.middleware.js';

const router = express.Router();

// All routes require SystemAdmin role
router.use(requireRole(['SystemAdmin']));

// Get all categories
router.get('/', productCategoryController.getCategories);

// Create new category
router.post('/', productCategoryController.createCategory);

// Update category
router.put('/:id', productCategoryController.updateCategory);

// Delete category and all descendants
router.delete('/:id', productCategoryController.deleteCategory);

export default router;


