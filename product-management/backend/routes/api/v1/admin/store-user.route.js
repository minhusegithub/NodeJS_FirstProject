import express from 'express';
import * as controller from '../../../../controllers/api/admin/store-user.controller.js';

const router = express.Router();

router.get('/roles', controller.getRoles);
router.get('/', controller.index);
router.post('/', controller.create);
router.put('/:id', controller.update);

export default router;
