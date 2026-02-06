import express from 'express';
import { authenticateUser } from '../../../../middlewares/jwt.middleware.js';
import productRoutes from './product.route.js';
import orderRoutes from './order.route.js';
import storeUserRoutes from './store-user.route.js';

const router = express.Router();

// All admin routes require authentication
router.use(authenticateUser);

router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/store-users', storeUserRoutes);

export default router;
