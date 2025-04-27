const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/chat.controller");

//goi controller

router.get('/', controller.index);


module.exports = router;