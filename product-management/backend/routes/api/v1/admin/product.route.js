import express from 'express';
import * as controller from '../../../../controllers/api/admin/product.controller.js';
import { requireRole } from '../../../../middlewares/role.middleware.js';
import multer from 'multer';

const router = express.Router();

// Use memory storage for Cloudinary upload
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', controller.index);
router.post('/', requireRole(['SystemAdmin']), upload.single('thumbnail'), controller.create);

router.get('/:id', requireRole(['SystemAdmin', 'storeManager', 'InventoryStaff']), controller.show);
router.put('/:id', requireRole(['SystemAdmin', 'storeManager', 'InventoryStaff']), upload.single('thumbnail'), controller.update);

export default router;
