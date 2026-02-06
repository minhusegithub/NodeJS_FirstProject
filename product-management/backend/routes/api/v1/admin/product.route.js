import express from 'express';
import * as controller from '../../../../controllers/api/admin/product.controller.js';

const router = express.Router();

router.get('/', controller.index);

export default router;
