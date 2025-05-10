const express = require('express');
const router = express.Router();

//khai bao controller 
const controller = require("../../controllers/client/chat.controller");

// khai bao middleware
const chatMiddleware = require("../../middlewares/clients/chat.middleware");



//goi controller

router.get('/:roomChatId', chatMiddleware.isAccess, controller.index);

module.exports = router;