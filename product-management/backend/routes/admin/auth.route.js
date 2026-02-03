const express = require('express');
const router = express.Router();



//Validate
const validate = require("../../validates/admin/auth.validate");

//khai bao controller
const controller = require("../../controllers/admin/auth.controller");


router.get('/login', controller.login);

router.post(
    '/login',
    validate.loginPost,
    controller.loginPost
);

router.get('/logout', controller.logout);


module.exports = router;