const express = require('express');
const router = express.Router();

//khai bao controller
const controller = require("../../controllers/client/users.controller");

//goi controller

router.get('/not-friend', controller.notFriend);

// router.get('/friend', controller.friend);
// router.get('/request', controller.request);
// router.get('/accept', controller.accept);


module.exports = router;