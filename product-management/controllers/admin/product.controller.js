
const Product = require("../../models/product.model")

const productCategory = require("../../models/product-category.model")

const Account = require("../../models/account.model")

const systemConfig = require("../../config/system");

const filterStatusHelper = require("../../helpers/filterStatus");

const searchHelper = require("../../helpers/search");

const createTreeHelper = require("../../helpers/createTree")


//[GET] /admin/products
module.exports.index = async (req , res) => {
    
    let find = {
        deleted: false
    }
    // Loc
    const filterStatus = filterStatusHelper(req.query);
    if(req.query.status){
        find.status =  req.query.status;
    }
    

    //Tim kiem
    const objectSearch = searchHelper(req.query);
    if(objectSearch.regex){
        find.title = objectSearch.regex;
    }


    //Pagination
    let objectPagination = {
        currentPage: 1,
        limitItems: 4
    };

    if(req.query.page){
        objectPagination.currentPage = parseInt(req.query.page);
    }
    objectPagination.skip = (objectPagination.currentPage - 1) * objectPagination.limitItems;

    const countProducts = await Product.countDocuments(find);
    const totalPage = Math.ceil (countProducts /objectPagination.limitItems) ;
    objectPagination.totalPage = totalPage;

    // Sap xep theo tieu chi
    let sort = {};
    if(req.query.sortKey && req.query.sortValue){
        sort[req.query.sortKey] = req.query.sortValue;
    } else{
        sort.position = "desc";
    }
    



    const products = await Product.find(find)
    .sort(sort)// sap xep theo thuoc tinh
    .limit(objectPagination.limitItems)// gioi han ban ghi/trang
    .skip(objectPagination.skip);// bo qua ban ghi

    for(const product of products){
        const user = await Account.findOne({
            _id: product.createdBy.account_id
        });
        if(user){
            product.accountFullName = user.fullName;
        }
        
        // lay ra thong tin nguoi cap nhat gan nhat
        const updatedBy = product.updatedBy.slice(-1)[0];
        if(updatedBy){
            const userUpdated = await Account.findOne({
                _id: updatedBy.account_id
            });
            updatedBy.accountFullName = userUpdated.fullName;
        }

    };



    // Gửi cho Views
    res.render("admin/pages/products/index" , {
        pageTitle: "Danh sách sản phẩm",
        products: products,
        filterStatus: filterStatus,
        keyword: objectSearch.keyword,
        pagination: objectPagination
    });

}

//[PATCH] /admin/products/change-status/:status/:id
module.exports.changeStatus = async ( req ,res)=>{

    const status = req.params.status;
    const id = req.params.id;

    const updatedBy = {
        account_id: res.locals.user.id,
        updatedAt: new Date()
    }

    

    await Product.updateOne({_id: id} , {
        status: status,
        $push: { updatedBy: updatedBy}
    });
    
    req.flash("success" , "Cập nhật trạng thái thành công!");

    res.redirect("back");

}

//[PATCH] /admin/products/change-multi
module.exports.changeMulti = async ( req ,res) => {
    const type = req.body.type;
    const ids = req.body.ids.split(", ");
    const updatedBy = {
        account_id: res.locals.user.id,
        updatedAt: new Date()
    }


    switch (type) {
        case "active":
            // CU PHAP DE UPDATE NHIEU RECORD <mongoose>
            await Product.updateMany({ _id: { $in: ids } } , {
                status: "active",
                $push: { updatedBy: updatedBy}
            });     
            req.flash("success" , `Cập nhật trạng thái thành công ${ids.length} sản phẩm!`);
            break;
        case "inactive":
            await Product.updateMany({ _id: { $in: ids } } , {
                status: "inactive",
                $push: { updatedBy: updatedBy}
            });
            req.flash("success" , `Cập nhật trạng thái thành công ${ids.length} sản phẩm!`);
            break; 
        case "delete-all":
            await Product.updateMany({ _id: { $in: ids } } , {
                deleted: true,
                deletedBy:{
                    account_id: res.locals.user.id,
                    deletedAt: new Date(),
                }
            }); 
            req.flash("success" , `Xóa thành công ${ids.length} sản phẩm!`);  
            break;
        case "change-position":
            for(const item of ids){
                let [id,position] =  item.split("-");
                await Product.updateOne({_id: id} ,{
                    position: position,
                    $push: { updatedBy: updatedBy}
                });             
            }
            req.flash("success" , `Cập nhật vị trí thành công ${ids.length} sản phẩm!`);
            break; 
        default:
            break;
    } 
    
    res.redirect("back");

}

//[DELETE] /admin/products/delete/:id
module.exports.deleteItem = async ( req ,res)=>{

    const id = req.params.id;
    // xoa mem (update) , xoa cung(delete)
    await Product.updateOne( {_id: id} , {
        deleted: true,
        deletedBy:{
            account_id: res.locals.user.id,
            deletedAt: new Date(),
        }
        }
    );


    req.flash("success" , `Xóa thành công sản phẩm!`);
    res.redirect("back");

}

//[GET] /admin/products/create
module.exports.create = async (req , res)=>{

    let find = {
            deleted: false
        }
        // Ham de quy de xay dung cay phan cap
        
    const category = await productCategory.find(find)
    
    const newCategory = createTreeHelper.tree(category);


    res.render("admin/pages/products/create" , {
        pageTitle: "Thêm mới sản phẩm",
        category: newCategory
    });
}

//[POST] /admin/products/create
module.exports.createPost = async (req , res)=>{

    req.body.price = parseInt(req.body.price);
    req.body.discountPercentage = parseInt(req.body.discountPercentage);
    req.body.stock = parseInt(req.body.stock);


    if(req.body.position == ""){
        const countProducts = await Product.countDocuments();
        req.body.position = countProducts + 1; 
    }else{
        req.body.position = parseInt(req.body.position);
    }

    req.body.createBy = {
        account_id:  res.locals.user.id

    }

    // tao moi san pham , luu vao DB
    const product = new Product(req.body);
    await product.save();

    res.redirect(`${systemConfig.prefixAdmin}/products`);

}

//[GET] /admin/products/edit/:id
module.exports.edit = async (req , res)=>{
    try {
        const find = { // tim ra san pham chua xoa , co Id tuong ung
            deleted: false,
            _id:req.params.id
        }


        const product = await Product.findOne(find);

        
        // Ham de quy de xay dung cay phan cap
        
        const category = await productCategory.find({
            deleted: false
        })
    
        const newCategory = createTreeHelper.tree(category);


        res.render("admin/pages/products/edit" , {
            pageTitle: "Chỉnh sửa sản phẩm",
            product: product,
            category: newCategory
        });

   }
    catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/products`);
    }

};

//[PATCH] /admin/products/edit/:id
module.exports.editPatch = async (req , res)=>{
    const id = req.params.id;

    req.body.price = parseInt(req.body.price);
    req.body.discountPercentage = parseInt(req.body.discountPercentage);
    req.body.stock = parseInt(req.body.stock);
    req.body.position = parseInt(req.body.position);
    
   
  
    // Update san pham trong DB
    
    try {
        const updatedBy = {
            account_id: res.locals.user.id,
            updatedAt: new Date()
        }

        await Product.updateOne( {_id: id}, {
            ...req.body,
            $push: { updatedBy: updatedBy}
        });
        req.flash("success" , `Cập nhật thành công sản phẩm!`);
        
    } catch (error) {
        req.flash("error" , `Cập nhật thất bại!`);
    }

    res.redirect("back");

};

//[GET] /admin/products/detail/:id
module.exports.detail = async (req , res)=>{
    try {
        const find = { // tim ra san pham chua xoa , co Id tuong ung
            deleted: false,
            _id:req.params.id
        }

        const product = await Product.findOne(find);

        //console.log(product);

        res.render("admin/pages/products/detail" , {
            pageTitle: product.title,
            product: product
        });

   }
    catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/products`);
    }

};


 





