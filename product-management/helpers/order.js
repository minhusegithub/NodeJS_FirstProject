const Product = require("../models/product.model");
const productsHelper = require("./products");

module.exports.newOrder = async (orders)=>{
    
    for(const order of orders){
        let totalPrice = 0;
        for(const product of order.products){
            const productInfo = await Product.findOne({_id: product.product_id});
            product.thumbnail = productInfo.thumbnail;
            product.title = productInfo.title;
            product.priceNew = productsHelper.priceNewProduct(productInfo);
            totalPrice += product.quantity * product.priceNew;
            if(order.isPlaceRushOrder){
                totalPrice += totalPrice * 0.05;
            }
        }
        order.totalPrice = totalPrice.toFixed(0);
    }
    
    return orders;

}