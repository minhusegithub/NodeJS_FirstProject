import express from 'express';
import { authenticateUser } from '../../../../middlewares/jwt.middleware.js';
import productRoutes from './product.route.js';
import orderRoutes from './order.route.js';
import storeUserRoutes from './store-user.route.js';
import productCategoryRoutes from './product-category.route.js';
import { storeRoutes } from "./store.route.js";

const router = express.Router();

// All admin routes require authentication
router.use(authenticateUser);

router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/stores', storeRoutes);
router.use('/store-users', storeUserRoutes);
router.use('/product-categories', productCategoryRoutes);

export default router;
