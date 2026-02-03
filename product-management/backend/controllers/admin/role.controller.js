
const Role = require("../../models/role.model")

const systemConfig = require("../../config/system");

//[GET] /admin/roles
module.exports.index = async (req , res) => {

    let find = {
        deleted: false
    };

    const records = await Role.find(find);


    res.render("admin/pages/roles/index" , {
        pageTitle: "Trang nhóm quyền",
        records: records
    });

}

//[GET] /admin/roles/create
module.exports.create = async (req , res) => {


    res.render("admin/pages/roles/create" , {
        pageTitle: "Trang nhóm quyền"
        
    });

}

//[POST] /admin/roles/create
module.exports.createPost = async (req , res) => {
    

    const record = new Role(req.body);
    await record.save();

    res.redirect(`${systemConfig.prefixAdmin}/roles`);

}

//[GET] /admin/roles/edit/:id
module.exports.edit = async (req , res) => {
    try {
        const id = req.params.id;
        let find = {
            _id:id,
            deleted:false
        }
        const data = await Role.findOne(find);
    
        res.render("admin/pages/roles/edit" , {
            pageTitle: "Chỉnh sửa nhóm quyền",
            data:data
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/roles`);
    }
   

}

//[PATCH] /admin/roles/edit/:id
module.exports.editPatch = async (req , res) => {
    const id = req.params.id;
  

    // Update san pham trong DB
    try {
        await Role.updateOne( {_id: id}, req.body);
        req.flash("success" , `Cập nhật thành công nhóm quyền!`);
        
    } catch (error) {
        req.flash("error" , `Cập nhật thất bại!`);
    }

    res.redirect("back");
   

}

//[GET] /admin/roles/edit
module.exports.detail = async (req , res) => {
    try {
        const find = { // tim ra san pham chua xoa , co Id tuong ung
            deleted: false,
            _id:req.params.id
        }

        const data = await Role.findOne(find);

        

        res.render("admin/pages/roles/detail" , {
            pageTitle: data.title,
            data: data
        });

   }
    catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/roles`);
    }
   

}

//[DELETE] /admin/roles/delete/:id
module.exports.deleteItem = async ( req ,res)=>{

    const id = req.params.id;
    // xoa mem (update) , xoa cung(delete)
    await Role.updateOne( {_id: id} , {
            deleted: true,
            deleteAt: new Date()
        }
    );
    req.flash("success" , `Xóa thành công nhóm quyền sản phẩm!`);
    res.redirect("back");

}


//[GET] /admin/roles/permissions
module.exports.permissions = async (req , res) => {
    let find={
        deleted: false
    };

    const records = await Role.find(find)
   

    res.render("admin/pages/roles/permissions" , {
        pageTitle: "Phân quyền",
        records: records
    });
}

//[PATCH] /admin/roles/permissions
module.exports.permissionsPatch = async (req , res) => {
   
    const permissions = JSON.parse( req.body.permissions );

    for (const item of permissions){  
        await Role.updateOne({_id:item.id} , {permissions: item.permissions})
    }
    
    req.flash( "success","Cập nhật phân quyền thành công!")

    res.redirect("back");
   

}

