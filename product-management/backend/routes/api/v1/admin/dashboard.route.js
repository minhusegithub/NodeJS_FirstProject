import express from 'express';
import * as dashboardController from '../../../../controllers/api/admin/dashboard.controller.js';

const router = express.Router();

router.get('/', dashboardController.index);

export default router;
