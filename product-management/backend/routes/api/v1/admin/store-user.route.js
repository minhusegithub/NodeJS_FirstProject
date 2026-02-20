import express from 'express';
import * as controller from '../../../../controllers/api/admin/store-user.controller.js';
import multer from 'multer';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/roles', controller.getRoles);
router.get('/', controller.index);
router.post('/', upload.single('avatar'), controller.create);
router.put('/:id', upload.single('avatar'), controller.update);

export default router;
