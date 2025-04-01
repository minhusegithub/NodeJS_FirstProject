
// nhung express
const express = require('express');
const methodOverride = require("method-override");
const bodyParser = require("body-parser");

//nhung dotenv
require("dotenv").config();

const database = require("./config/database.js");
database.connect();

const route = require("./routes/client/index.route")
const routeAdmin = require("./routes/admin/index.route")
const systemConfig = require("./config/system");



const app = express();
const port = process.env.PORT;
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extends: false }));

// cau hinh pug
app.set('views', './views');
app.set('view engine', 'pug');

//App locals variables
app.locals.prefixAdmin = systemConfig.prefixAdmin;



// nhung file tinh
app.use(express.static('public'));

// Routes
route(app);
routeAdmin(app);


app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})







