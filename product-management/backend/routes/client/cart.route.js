const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/cart.controller");

//goi controller

router.post('/add/:productId', controller.addPost);

router.get('/', controller.index);

router.get('/delete/:productId', controller.delete);

router.get('/update/:productId/:quantity', controller.update);


module.exports = router;