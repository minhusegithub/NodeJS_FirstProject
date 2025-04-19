const express = require('express');
const router = express.Router();

//import module controller
const controller = require("../../controllers/client/product.controller");

//định nghĩa route / sử dụng phương thức GET
router.get('/', controller.index);


router.get('/:slugCategory', controller.category);

router.get('/detail/:slugProduct', controller.detail);

module.exports = router;

