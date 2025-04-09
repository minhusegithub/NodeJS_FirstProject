const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/admin/role.controller");

//goi controller
router.get('/', controller.index);

router.get('/create', controller.create);

router.post('/create', controller.createPost);

module.exports = router;