import express from 'express';
import * as controller from '../../../../controllers/api/admin/store-user.controller.js';

const router = express.Router();

router.get('/', controller.index);
router.post('/', controller.create);

export default router;
