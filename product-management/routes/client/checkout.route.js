const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/checkout.controller");
const authMiddleware = require("../../middlewares/clients/auth.middleware");

//goi controller

router.get('/', controller.index);

router.get('/create_payment_url', controller.createPaymentUrl);

router.get('/vnpay/return', controller.vnpayReturn);

router.get('/success/:orderId', controller.success);



module.exports = router;