const categoryMiddleware = require("../../middlewares/clients/category.middleware")
const cartMiddleware = require("../../middlewares/clients/cart.middleware")


const productRouter = require("./product.route");
const homeRouter = require("./home.route");
const searchRoutes = require("./search.route");
const cartRoutes = require("./cart.route");

module.exports = (app)=>{ 


    app.use( categoryMiddleware.category );
    app.use( cartMiddleware.cartId );
    
    app.use('/', homeRouter );

    app.use('/products', productRouter );
    
    app.use('/search', searchRoutes );
    
    app.use('/cart', cartRoutes );
    
}