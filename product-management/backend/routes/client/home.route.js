const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/home.controller");

//goi controller
router.get('/', controller.index);


module.exports = router;