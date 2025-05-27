const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Order = require("../../models/order.model")
const User = require("../../models/user.model")

const productsHelper = require("../../helpers/products");
 
//[GET] /order
module.exports.index = async (req, res ,next)=>{

    const user = await User.findOne({tokenUser: req.cookies.tokenUser});
    const carts = await Cart.find({user_id: user.id});
    const cartIds = carts.map(cart => cart.id);
    const orders = await Order.find({
        cart_id: { $in: cartIds },
        "products.0": { $exists: true },
        status: { $in: ["Processing", "Delivering"] }
    });
    
    res.render("client/pages/order/index" , {
        pageTitle: "Đơn hàng",
        orders: orders
    });
}

//[GET] /order/history
module.exports.history = async (req, res ,next)=>{
    // Mục đích của hàm là lấy ra danh sách đơn hàng của người dùng đang đăng nhập
   
    const user = await User.findOne({tokenUser: req.cookies.tokenUser});
    const carts = await Cart.find({user_id: user.id});
    let orderHistory = [];
    const cartIds = carts.map(cart => cart.id);
    const orders = await Order.find({
        cart_id: { $in: cartIds },
        "products.0": { $exists: true },
        status: "Received"
    });
    // Thêm thuộc tính thumbnail và title vào mảng products của đơn hàng
    for(const order of orders){
        let totalPrice = 0;
        for(const product of order.products){
            const productInfo = await Product.findOne({_id: product.product_id});
            product.thumbnail = productInfo.thumbnail;
            product.title = productInfo.title;
            product.priceNew = productsHelper.priceNewProduct(productInfo);
            totalPrice += product.quantity * product.priceNew;
        }
        order.totalPrice = totalPrice;
    }
    // Chỉ những order có products.length > 0 mới được hiển thị
    
    
    // console.log(orders);
   
    



    res.render("client/pages/order/history" , {
        pageTitle: "Lịch sử đặt hàng",
        orders: orders
    });
}

//[GET] /order/waiting
module.exports.waiting = async (req, res ,next)=>{

    const user = await User.findOne({tokenUser: req.cookies.tokenUser});
    const carts = await Cart.find({user_id: user.id});
    const cartIds = carts.map(cart => cart.id);
    const orders = await Order.find({
        cart_id: { $in: cartIds },
        "products.0": { $exists: true },
        status: { $in: ["Processing", "Delivering"] }
    });
    // Thêm thuộc tính thumbnail và title vào mảng products của đơn hàng
    for(const order of orders){
        let totalPrice = 0;
        for(const product of order.products){
            const productInfo = await Product.findOne({_id: product.product_id});
            product.thumbnail = productInfo.thumbnail;
            product.title = productInfo.title;
            product.priceNew = productsHelper.priceNewProduct(productInfo);
            totalPrice += product.quantity * product.priceNew;
        }
        order.totalPrice = totalPrice;
    }
  
    
    
    

    res.render("client/pages/order/waiting" , {
        pageTitle: "Chờ lấy hàng",
        orders: orders
    });
}

//[PATCH] /order/change-status/:status/:id
module.exports.changeStatus = async (req, res ,next)=>{

    const status = req.params.status;
    const id = req.params.id;

    const order = await Order.findOne({_id: id});
    await Order.updateOne({_id: id} ,{
        status: status,
    })   
    if(status == "Cancelled"){ 
        // Nếu hủy đơn hàng và phương thức thanh toán  khác "COD" thì trả lại tiền cho khách hàng
        if(order.paymentMethod != "COD"){
            //Thông báo hoàn tiền
            req.flash("success" ,`Đã hoàn tiền cho khách hàng do phương thức thanh toán là ${order.paymentMethod}!`);
        // Nếu là "COD" thì không trả lại tiền và thông báo thành công
        }else{
            req.flash("success" , "Đơn hàng đã được hủy bỏ!");
        }
    }else{
        req.flash("success" , "Đã xác nhận thành công nhận hàng!");
    }

    res.redirect("back");
    
}
