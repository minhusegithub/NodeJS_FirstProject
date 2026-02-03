const ProductCategory = require("../../models/product-category.model");
const Product = require("../../models/product.model");
const Account = require("../../models/account.model");
const User = require("../../models/user.model");

//[GET] /admin/dashboard
module.exports.dashboard = async (req , res) => {
    const statistic = {
        categoryProduct: {
            total: 0,
            active: 0,
            inactive: 0
        },
        product: {
            total: 0,
            active: 0,
            inactive: 0
        },
        account: {
            total: 0,
            active: 0,
            inactive: 0
        },    
        user:{
            total: 0,
            active: 0,
            inactive: 0
        }  
    }

    //Category Product
    statistic.categoryProduct.total = await ProductCategory.countDocuments({
        deleted:false
    });
    statistic.categoryProduct.active = await ProductCategory.countDocuments({
        deleted:false,
        status:"active"
    });
    statistic.categoryProduct.inactive = statistic.categoryProduct.total - statistic.categoryProduct.active;

    //Product
    statistic.product.total = await Product.countDocuments({
        deleted:false
    });
    statistic.product.active = await Product.countDocuments({
        deleted:false,
        status:"active"
    });
    statistic.product.inactive = statistic.product.total - statistic.product.active;

    //Account
    statistic.account.total = await Account.countDocuments({
        deleted:false
    });
    statistic.account.active = await Account.countDocuments({
        deleted:false,
        status:"active"
    });
    statistic.account.inactive = statistic.account.total - statistic.account.active;

    //User
    statistic.user.total = await User.countDocuments({
        deleted:false
    });
    statistic.user.active = await User.countDocuments({
        deleted:false,
        status:"active"
    });
    statistic.user.inactive = statistic.user.total - statistic.user.active;
    
   
    
    

    res.render("admin/pages/dashboard/index" , {
        pageTitle: "Tổng quan",
        statistic:statistic
    });

}










