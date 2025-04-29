const categoryMiddleware = require("../../middlewares/clients/category.middleware")
const cartMiddleware = require("../../middlewares/clients/cart.middleware")
const userMiddleware = require("../../middlewares/clients/user.middleware")
const settingMiddleware = require("../../middlewares/clients/setting.middleware")
const authMiddleware = require("../../middlewares/clients/auth.middleware");


const productRouter = require("./product.route");
const homeRouter = require("./home.route");
const searchRoutes = require("./search.route");
const cartRoutes = require("./cart.route");
const checkoutRoutes = require("./checkout.route");
const userRoutes = require("./user.route");
const chatRoutes = require("./chat.route");
const orderRoutes = require("./order.route");

module.exports = (app)=>{ 

    app.use( categoryMiddleware.category );
    app.use( cartMiddleware.cartId );
    app.use( userMiddleware.infoUser  );
    app.use( settingMiddleware.settingGeneral );

    app.use('/', homeRouter );

    app.use('/products', productRouter );
    
    app.use('/search', searchRoutes );
    
    app.use('/cart', cartRoutes );
    
    app.use('/checkout', checkoutRoutes );

    app.use('/user', userRoutes );

    app.use('/chat', authMiddleware.requireAuth , chatRoutes );

    app.use('/order', orderRoutes );
}