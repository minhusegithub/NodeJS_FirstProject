import express from 'express';
import * as controller from '../../../controllers/api/store.controller.js';


import { authenticateUser } from '../../../middlewares/jwt.middleware.js';
import { authorize } from '../../../middlewares/rbac.middleware.js';

const router = express.Router();

// Public routes - anyone can view stores
router.get('/', controller.getStores);
router.get('/:id', controller.getStoreDetail);

// Protected routes - Only SystemAdmin can create/delete stores
router.post('/', authenticateUser, authorize(['SystemAdmin', 'store-create']), controller.createStore);
router.put('/:id', authenticateUser, authorize(['storeManager', 'SystemAdmin']), controller.updateStore);
router.delete('/:id', authenticateUser, authorize(['SystemAdmin', 'store-delete']), controller.deleteStore);

export const storeRoutes = router;
