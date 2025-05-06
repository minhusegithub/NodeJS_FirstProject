const Order = require("../../models/order.model")

module.exports.orderId = async (req , res , next)=>{
    

    if(!req.cookies.orderId){
        const order = new Order({ cart_id: req.cookies.cartId });
        await order.save();
        // Tính thời gian hết hạn cho order (1 tháng)
        const expiresTime = 1000 * 60 * 60 * 24 *30;

        res.cookie("orderId" , order.id , {
            expires: new Date(Date.now() +expiresTime )
        });
        res.locals.order = order;
    } 
    else{
        const order = await Order.findOne({
            _id: req.cookies.orderId
        });
        
        res.locals.order = order;
    }
    
    next();
}