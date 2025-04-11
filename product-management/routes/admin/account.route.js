const express = require('express');
const multer = require("multer");
const router = express.Router();
const upload = multer();


//Validate
const validate = require("../../validates/admin/account.validate");

const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware")

//khai bao controller
const controller = require("../../controllers/admin/account.controller");

//goi controller
router.get('/', controller.index);

router.get('/create', controller.create);

router.post(
    '/create',
    upload.single("avatar"),
    uploadCloud.upload,
    validate.createPost, 
    controller.createPost
);
router.get('/edit/:id', controller.edit);

router.patch(
    '/edit/:id',
    upload.single("avatar"),
    uploadCloud.upload,
    validate.editPatch,
    controller.editPatch
);


module.exports = router;