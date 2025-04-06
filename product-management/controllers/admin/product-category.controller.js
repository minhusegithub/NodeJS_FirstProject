
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

//[GET] /admin/products-category/edit/:id
module.exports.edit = async (req , res) => {
    try {
        const id = req.params.id;
    
        const data =await productCategory.findOne({
            _id:id,
            deleted: false
        })

        const records = await productCategory.find({
            deleted: false
        })
        
        const newRecords = createTreeHelper.tree(records);

        res.render("admin/pages/products-category/edit" , {
            pageTitle: "Chỉnh sửa danh mục sản phẩm",
            data: data,
            records: newRecords
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/products-category`);
    }

}

//[PATCH] /admin/products-category/edit/:id
module.exports.editPatch = async (req , res) => {
   
    const id = req.params.id;
    req.body.position = parseInt(req.body.position);


     
    try {
        await productCategory.updateOne( {_id: id}, req.body);
        req.flash("success" , `Cập nhật thành công danh mục sản phẩm!`);
        
    } catch (error) {
        req.flash("error" , `Cập nhật thất bại!`);
    }

    res.redirect("back");

    
}

//[GET] /admin/products-category/detail/:id
module.exports.detail = async (req , res)=>{
    try {
        const find = { // tim ra san pham chua xoa , co Id tuong ung
            deleted: false,
            _id:req.params.id
        }

        const data = await productCategory.findOne(find);

        

        res.render("admin/pages/products-category/detail" , {
            pageTitle: data.title,
            data: data
        });

   }
    catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/products-category`);
    }

};

//[DELETE] /admin/products-category/delete/:id
module.exports.deleteItem = async ( req ,res)=>{

    const id = req.params.id;
    // xoa mem (update) , xoa cung(delete)
    await productCategory.updateOne( {_id: id} , {
            deleted: true,
            deleteAt: new Date()
        }
    );
    req.flash("success" , `Xóa thành công danh mục sản phẩm!`);
    res.redirect("back");

}
