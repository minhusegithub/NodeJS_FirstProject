
const productCategory = require("../../models/product-category.model")

const systemConfig = require("../../config/system");

const createTreeHelper = require("../../helpers/createTree")

//[GET] /admin/products-category
module.exports.index = async (req , res) => {
   
    let find = {
        deleted: false
    }
    // Ham de quy de xay dung cay phan cap
    createTreeHelper.creatTree



    const records = await productCategory.find(find)

    const newRecords = createTreeHelper.tree(records);

    res.render("admin/pages/products-category/index" , {
        pageTitle: "Danh mục sản phẩm",
        records: newRecords
    });

}

//[GET] /admin/products-category/create
module.exports.create = async (req , res) => {
   
    let find = {
        deleted: false
    }
    // Ham de quy de xay dung cay phan cap
    
    const records = await productCategory.find(find)

    const newRecords = createTreeHelper.tree(records);

    // console.log(newRecords);

    res.render("admin/pages/products-category/create" , {
        pageTitle: "Tạo danh mục sản phẩm",
        records: newRecords
    });

}

//[POST] /admin/products-category/create
module.exports.createPost = async (req , res)=>{

    if(req.body.position == ""){
        const count = await productCategory.countDocuments();
        req.body.position = count + 1; 
    }else{
        req.body.position = parseInt(req.body.position);
    }

    // tao moi va luu vao DB
    const record = new productCategory(req.body);
    await record.save();

    res.redirect(`${systemConfig.prefixAdmin}/products-category`);

}