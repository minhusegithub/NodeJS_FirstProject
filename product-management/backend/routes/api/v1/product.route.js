import express from 'express';
import * as controller from '../../../controllers/api/product.controller.js';
import { authenticateUser } from '../../../middlewares/jwt.middleware.js';
import { authorize } from '../../../middlewares/rbac.middleware.js';

const router = express.Router();

// Public routes (no auth required for viewing products)
router.get('/', controller.getProducts);
router.get('/:id', controller.getProductDetail);

// Protected routes - require authentication and specific roles
router.post('/',
    authenticateUser,
    authorize(['storeManager', 'InventoryStaff', 'SystemAdmin']),
    controller.createProduct
);

router.put('/:id',
    authenticateUser,
    authorize(['storeManager', 'InventoryStaff', 'SystemAdmin']),
    controller.updateProduct
);

router.delete('/:id',
    authenticateUser,
    authorize(['SystemAdmin']), // Only SystemAdmin can delete products
    controller.deleteProduct
);

// Inventory management
router.post('/:id/inventory',
    authenticateUser,
    authorize(['storeManager', 'InventoryStaff', 'SystemAdmin']),
    controller.updateProductInventory
);

export default router;
