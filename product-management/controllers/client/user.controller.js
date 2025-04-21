const md5 = require("md5");

const User = require("../../models/user.model")
const Cart = require("../../models/cart.model");
const Product = require("../../models/product.model");
const productsHelper = require("../../helpers/products");
 
// [GET] /user/register
module.exports.register = async (req, res ,next)=>{
   
    res.render("client/pages/user/register" , {
        pageTitle: "Đăng ký tài khoản",
    });
}

// [POST] /user/register
module.exports.registerPost = async (req, res ,next)=>{
    const existEmail = await User.findOne({
        email:req.body.email,
        deleted: false
    });

    if(existEmail){
        req.flash("error","Email đã tồn tại!");
        res.redirect("back");
        return;
    }

    req.body.password = md5(req.body.password);
    const user = new User(req.body);
    await user.save();

    res.cookie("tokenUser" , user.tokenUser )
    res.redirect("/");
}

// [GET] /user/login
module.exports.login = async (req, res ,next)=>{
    res.render("client/pages/user/login" , {
        pageTitle: "Đăng nhập tài khoản",
    });
}

// [POST] /user/login
module.exports.loginPost = async (req, res ,next)=>{

    const email = req.body.email;
    const password = req.body.password;

    const user = await User.findOne({
        email:email,
        deleted: false
    });

    if(!user){
        req.flash("error","Email không tồn tại!");
        res.redirect("back");
        return;
    }
    if(md5(password) != user.password){
        req.flash("error","Sai mật khẩu!");
        res.redirect("back");
        return;
    }
    if(user.status  == "inactive"){
        req.flash("error","Tài khoản đang bị khóa!");
        res.redirect("back");
        return;
    }

    res.cookie("tokenUser" , user.tokenUser)


    res.redirect("/");
    

}