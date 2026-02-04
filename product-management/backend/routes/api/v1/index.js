import express from 'express';
import authRoutes from './auth.route.js';
import productRoutes from './product.route.js';
import cartRoutes from './cart.route.js';
import orderRoutes from './order.route.js';
import userRoutes from './user.route.js';
import adminRoutes from './admin/index.js';
import { storeRoutes } from './store.route.js';

const router = express.Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/stores', storeRoutes); // Add stores route

// Protected routes
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/user', userRoutes);

// Admin routes
router.use('/admin', adminRoutes);

export default router;
