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

// [GET] /checkout/placeRushOrder/:fullName/:phone/:address/:isPlaceRushOrder
module.exports.placeRushOrder = async (req, res, next) => {
    const fullName = req.params.fullName;
    const phone = req.params.phone;
    const address = req.params.address;
    const isPlaceRushOrder = req.params.isPlaceRushOrder;//yes or no
    const paymentMethod = req.params.paymentMethod;

    const cartId = req.cookies.cartId;
    const cart = await Cart.findOne({
        _id:cartId
    });
    
    const orderId = req.cookies.orderId;// lấy ra order hiện tại
    const order = await Order.findOne({
        _id:orderId
    });

    // Cập nhật
    order.userInfo = {  
        fullName:fullName,
        phone:phone,
        address:address
    };
    order.isPlaceRushOrder = (isPlaceRushOrder === "yes" ? true : false );
    order.paymentMethod = paymentMethod;

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

    
    // Tính phí giao hàng nhanh (5% của tổng đơn hàng)
    const rushOrderFee = Number((cart.totalPrice * 0.05 ).toFixed(0));
    
    // Nếu là đơn hàng giao nhanh
    if(order.isPlaceRushOrder){
        // Thêm thuộc tính rushOrder vào order
        order.rushOrder = rushOrderFee;
        
        // Cập nhật tổng giá đơn hàng trong cart
        cart.totalPrice = cart.totalPrice + rushOrderFee;

    }

    // Lưu cả order và cart
    await order.save();
    await cart.save();

   
    res.render("client/pages/checkout/index" , {
        pageTitle: "Đặt hàng",
        cartDetail:cart,
        order:order
        
    });
    
   
}

// [GET] /checkout/create_payment_url
module.exports.createPaymentUrl = async (req, res, next) => {
    const vnpay = new VNPay({
         // Thông tin cấu hình bắt buộc
        tmnCode: process.env.VNPAY_TMNCODE,
        secureSecret: process.env.VNPAY_SECURESECRET,
        vnpayHost: process.env.VNPAY_HOST,

         // Cấu hình tùy chọn
        testMode: true,  // Chế độ test
        hashAlgorithm: "SHA512",  // Thuật toán mã hóa
        logger: ignoreLogger, // Hàm xử lý log tùy chỉnh


        // Tùy chỉnh endpoints cho từng phương thức API (mới)
        // Hữu ích khi VNPay thay đổi endpoints trong tương lai
        endpoints: {
            paymentEndpoint: 'paymentv2/vpcpay.html',                 // Endpoint thanh toán
            queryDrRefundEndpoint: 'merchant_webapi/api/transaction', // Endpoint tra cứu & hoàn tiền
            getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list', // Endpoint lấy danh sách ngân hàng
        }
        
    });

    const orderId = req.cookies.orderId;
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
           vnp_TxnRef: orderId + Date.now(), // là duy nhất
           vnp_OrderInfo: `Thanh toán đơn hàng ${orderId}`,
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



    
    if(req.query.vnp_ResponseCode !== "00"){ // Nếu không thành công
        res.redirect(`/checkout`);
    }else{
        // Tìm order hiện tại
        const orderId = req.cookies.orderId;
        const order = await Order.findOne({
            _id:orderId
        });
        
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

        await Order.updateOne(
            {
                _id:orderId
            },
            {
                // userInfo:{
                //     fullName:req.body.fullName,
                //     phone:req.body.phone,
                //     address:req.body.address
                // },
                // isPlaceRushOrder:req.body.isPlaceRushOrder,
                // paymentMethod:req.body.paymentMethod,
                products:products
            }
        );

    

        //Làm trống giỏ hàng
        await Cart.updateOne(
            {
                _id: cartId
            },
            {
                products:[]
            }
        );

        res.redirect(`/checkout/success`);
    }

    
    
};

// [POST] /checkout/realPayment
module.exports.realPayment = async (req, res ,next)=>{

    // Tìm order hiện tại
    const orderId = req.cookies.orderId;
    const order = await Order.findOne({
        _id:orderId
    });
    
    
  
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
        });

        objectProduct.price = productInfo.price;
        objectProduct.discountPercentage = productInfo.discountPercentage;
        products.push(objectProduct);
        
    }
    await Order.updateOne(
        {
            _id:orderId
        },
        {
            userInfo:{
                fullName:req.body.fullName,
                phone:req.body.phone,
                address:req.body.address
            },
            isPlaceRushOrder:req.body.isPlaceRushOrder,
            paymentMethod:req.body.paymentMethod,
            products:products
        }
    );
   

    

    // Làm trống giỏ hàng
    await Cart.updateOne(
        {
            _id: cartId
        },
        {
            products:[]
        }
    );

    res.redirect(`/checkout/success`);

}

// [GET] /checkout/success
module.exports.success = async (req, res ,next)=>{
   
   
    const orderId = req.cookies.orderId;
    const order = await Order.findOne({
        _id:orderId
    });

    for(const product of order.products){
        const productInfo = await Product.findOne({
            _id:product.product_id
        }).select("title thumbnail");

        product.productInfo = productInfo;

        product.priceNew = productsHelper.priceNewProduct(product);
        product.totalPrice = product.priceNew * product.quantity;

    }

    order.totalPrice = order.products.reduce((sum , item) => sum + item.totalPrice , 0);
    if(order.isPlaceRushOrder){
        order.totalPrice = Number((order.totalPrice * 1.05).toFixed(0));
    }
    // Xóa cookie orderId khi đặt hàng thành công
    order.status = "Processing";
    await order.save();
    res.clearCookie("orderId");

    
    
    res.render("client/pages/checkout/success" , {
        pageTitle: "Đặt hàng thành công",
        order:order
    })


}
