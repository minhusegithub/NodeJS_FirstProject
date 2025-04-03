
// nhung express
const express = require('express');
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require('express-flash');


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

//Body Parser
app.use(bodyParser.urlencoded({ extends: false }));

// cau hinh pug
app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');

// flash
app.use(cookieParser('MINH'));
app.use(session({ cookie: { maxAge: 60000 }}));
app.use(flash());
// End flash

//App locals variables
app.locals.prefixAdmin = systemConfig.prefixAdmin;

// nhung file tinh
app.use(express.static(`${__dirname}/public`));



// Routes
route(app);
routeAdmin(app);


app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})







