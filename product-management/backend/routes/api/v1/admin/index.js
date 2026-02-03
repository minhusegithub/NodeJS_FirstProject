import express from 'express';
import { authenticateAdmin } from '../../../../middlewares/jwt.middleware.js';
import dashboardRoutes from './dashboard.route.js';
import productRoutes from './product.route.js';
import orderRoutes from './order.route.js';

const router = express.Router();

// All admin routes require authentication
router.use(authenticateAdmin);

router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

export default router;
