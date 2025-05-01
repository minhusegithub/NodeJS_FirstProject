const {VNPay ,ignoreLogger , ProductCode , VnpLocale ,dateFormat} = require("vnpay");
const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const Order = require("../../models/order.model")

const productsHelper = require("../../helpers/products");
 
// [GET] /checkout/
module.exports.index = async (req, res ,next)=>{
   
   
    const cartId = req.cookies.cartId;
    const cart = await Cart.findOne({
        _id:cartId
    });

    if(cart.products.length > 0){
        for(const item of cart.products){
            const productId = item.product_id;
            const productInfo = await Product.findOne({
                _id: productId
            }).select("title thumbnail slug price discountPercentage");
            productInfo.priceNew = productsHelper.priceNewProduct(productInfo);
            
            item.productInfo = productInfo;
            
            item.totalPrice = item.quantity*productInfo.priceNew;
            

        }
    }
    cart.totalPrice = cart.products.reduce((sum , item)=> sum + item.totalPrice , 0);


    res.render("client/pages/checkout/index" , {
        pageTitle: "Đặt hàng",
        cartDetail:cart
    })


}

// [POST] /checkout/payment
module.exports.createPaymentUrl = async (req, res, next) => {
    const vnpay = new VNPay({
        tmnCode: "X3N7YSUW",
        secureSecret: "GCUJ70SCBP8IIOFCM3HXMQ78GIIYC4LP",
        vnpayHost: 'https://sandbox.vnpayment.vn',
        testMode: true,
        hashAlgorithm: "SHA512",
        logger: ignoreLogger,
        endpoints: {
            paymentEndpoint: 'paymentv2/vpcpay.html',                 // Endpoint thanh toán
            // queryDrRefundEndpoint: 'merchant_webapi/api/transaction', // Endpoint tra cứu & hoàn tiền
            getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list', // Endpoint lấy danh sách ngân hàng
        }
        
    });

    
    const cartId = req.cookies.cartId;
    const cart = await Cart.findOne({
        _id:cartId
    });
    if(cart.products.length > 0){
        for(const item of cart.products){
            const productId = item.product_id;
            const productInfo = await Product.findOne({
                _id: productId
            });
            productInfo.priceNew = productsHelper.priceNewProduct(productInfo);
            
            item.productInfo = productInfo;
            
            item.totalPrice = item.quantity*productInfo.priceNew;
            

        }
    }
    cart.totalPrice = cart.products.reduce((sum , item)=> sum + item.totalPrice , 0);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const vnpayResponse = await vnpay.buildPaymentUrl(
        {
           vnp_Amount: cart.totalPrice * 1000,
           vnp_IpAddr: "127.0.0.1",
           vnp_TxnRef: cart.id,
           vnp_OrderInfo: `Thanh toán đơn hàng ${cart.id}`,
           vnp_OrderType: ProductCode.Other,
           vnp_ReturnUrl: "http://localhost:3000/checkout/vnpay/return",
           vnp_Locale: VnpLocale.VN,
           vnp_CreateDate: dateFormat(new Date()),
           vnp_ExpireDate: dateFormat(tomorrow)
           
        }
    );
    
    res.redirect(vnpayResponse);
   
};

// //[GET] /checkout/vnpay/return
module.exports.vnpayReturn = async (req, res) => {

    const cartId = req.cookies.cartId;
    const cart = await Cart.findOne({
        _id:cartId
    });

    let products =[];

    for(const product of cart.products){
        const objectProduct = {
            product_id: product.product_id,
            price:0,
            discountPercentage: 0,
            quantity: product.quantity
        };
        const productInfo = await Product.findOne({
            _id: product.product_id
        }).select("price discountPercentage");

        objectProduct.price = productInfo.price;
        objectProduct.discountPercentage = productInfo.discountPercentage;
        products.push(objectProduct);
        
    }

    //Object Order
    const objectOrder = {  
        cart_id: cartId,
        products: products
    }

    //Tạo và lưu vào DB
    const order = new Order(objectOrder);
    await order.save();

    //Làm trống giỏ hàng
    await Cart.updateOne(
        {
            _id: cartId
        },
        {
            products:[]
        }
    );

    res.redirect(`/checkout/success/${order.id}`);
    
};

// [GET] /checkout/success/:orderId
module.exports.success = async (req, res ,next)=>{
   
   
    const order = await Order.findOne({
        _id:req.params.orderId
    })

    for(const product of order.products){
        const productInfo = await Product.findOne({
            _id:product.product_id
        }).select("title thumbnail");

        product.productInfo = productInfo;

        product.priceNew = productsHelper.priceNewProduct(product);
        product.totalPrice = product.priceNew * product.quantity;

    }

    order.totalPrice = order.products.reduce((sum , item) => sum + item.totalPrice , 0);



    res.render("client/pages/checkout/success" , {
        pageTitle: "Đặt hàng thành công",
        order:order
    })


}
