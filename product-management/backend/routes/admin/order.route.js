const express = require('express');
const multer = require('multer');

const router = express.Router();
const upload = multer();


// const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware")



//khai bao controller
const controller = require("../../controllers/admin/order.controller");



//goi controller
router.get('/', controller.index);
router.patch('/change-status/:status/:id', controller.changeStatus);


module.exports = router;