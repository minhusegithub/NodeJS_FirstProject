const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/admin/role.controller");

//goi controller
router.get('/', controller.index);

router.get('/create', controller.create);

router.post('/create', controller.createPost);

router.get('/edit/:id', controller.edit);

router.patch('/edit/:id', controller.editPatch);

router.get('/permissions', controller.permissions);

router.patch('/permissions', controller.permissionsPatch);

router.get('/detail/:id', controller.detail);

router.delete("/delete/:id" , controller.deleteItem);


module.exports = router;