// nhung express
const express = require('express');
const path = require("path");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require('express-flash');
const moment = require('moment');
const http = require('http');
const { Server } = require("socket.io");


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

// Socket.io
const server = http.createServer(app);
const io = new Server(server);
global._io = io;



// flash
app.use(cookieParser('MINH'));
app.use(session({ cookie: { maxAge: 60000 }}));
app.use(flash());
// End flash

//TinyMCE

app.use('/tinymce',
  express.static(path.join(__dirname, "node_modules", "tinymce"))
);

//End TinyMCE

//App locals variables
app.locals.prefixAdmin = systemConfig.prefixAdmin;
app.locals.moment = moment;

// nhung file tinh
app.use(express.static(`${__dirname}/public`));
app.use('/node_modules', express.static(path.join(__dirname, "node_modules"), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));



// Routes
route(app);
routeAdmin(app);

// 404
app.get("*", (req, res) => {
  res.render("client/pages/errors/404",{
      pageTitle: "404 Not Found"
  });
});


server.listen(port, () => {
  console.log(`App listening on port ${port}`)
})










