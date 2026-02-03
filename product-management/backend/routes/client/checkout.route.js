const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/checkout.controller");
const authMiddleware = require("../../middlewares/clients/auth.middleware");


//goi controller

router.get('/', controller.index);

// Giao hàng nhanh
router.get('/placeRushOrder/:fullName/:phone/:address/:isPlaceRushOrder/:paymentMethod', controller.placeRushOrder);

// Thanh toán VNPay
router.get('/create_payment_url', controller.createPaymentUrl);
router.get('/vnpay/return', controller.vnpayReturn);

//Thanh toán khi nhận hàng
router.post('/realPayment', controller.realPayment);

//Thanh toán thành công
router.get('/success', controller.success);



module.exports = router;