const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/order.controller");

//goi controller

router.get('/', controller.index);

router.get('/history', controller.history);

router.get('/waiting', controller.waiting);

router.patch('/change-status/:status/:id', controller.changeStatus);



module.exports = router;