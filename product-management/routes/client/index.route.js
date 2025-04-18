
const productRouter = require("./product.route");
const homeRouter = require("./home.route");
const categoryMiddleware = require("../../middlewares/clients/category.middleware")

module.exports = (app)=>{ 


    app.use( categoryMiddleware.category );
    
    app.use('/', homeRouter );

    app.use('/products', productRouter );
    
    

}