const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/order.controller");

//goi controller

router.get('/history', controller.history);

module.exports = router;