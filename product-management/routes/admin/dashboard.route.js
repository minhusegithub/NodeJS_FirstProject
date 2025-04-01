const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/admin/dashboard.controller");

//goi controller
router.get('/', controller.dashboard);


module.exports = router;