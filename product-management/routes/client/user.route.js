const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/user.controller");

const validate = require("../../validates/client/user.validate")

//goi controller
router.get('/register', controller.register);

router.post('/register' , validate.registerPost , controller.registerPost);

router.get('/login', controller.login);

router.post('/login', validate.loginPost , controller.loginPost);




module.exports = router;

