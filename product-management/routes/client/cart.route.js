const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/cart.controller");

//goi controller

router.post('/add/:productId', controller.addPost);

router.get('/', controller.index);



module.exports = router;