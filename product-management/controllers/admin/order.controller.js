const Order = require("../../models/order.model");
const orderHelper = require("../../helpers/order");

//[GET] /admin/orders
module.exports.index = async (req , res) => {

    const orders = await Order.find({
        status: "Processing"
    });
    // Thêm thuộc tính thumbnail và title vào mảng products của đơn hàng
    const newOrders = await orderHelper.newOrder(orders);
    
    res.render("admin/pages/order/index" , {
        pageTitle: "Đơn hàng",
        orders: newOrders
    });

}

//[PATCH] /admin/orders/change-status/:status/:id
module.exports.changeStatus = async (req , res) => {
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
        req.flash("success" , "Đơn hàng đang được giao!");
    }

    res.redirect("back");
    
    
}
