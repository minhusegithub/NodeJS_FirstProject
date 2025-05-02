const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Order = require("../../models/order.model")
const User = require("../../models/user.model")

const productsHelper = require("../../helpers/products");
 
//[GET] /order/history
module.exports.history = async (req, res ,next)=>{
    // Mục đích của hàm là lấy ra danh sách đơn hàng của người dùng đang đăng nhập
   
    const user = await User.findOne({tokenUser: req.cookies.tokenUser});
    const carts = await Cart.find({user_id: user.id});
    let orderHistory = [];
    const cartIds = carts.map(cart => cart.id);
    const orders = await Order.find({cart_id: {$in: cartIds}});
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
    
    // console.log(orders);
   
    



    res.render("client/pages/order/history" , {
        pageTitle: "Lịch sử đặt hàng",
        orders: orders
    });
}
