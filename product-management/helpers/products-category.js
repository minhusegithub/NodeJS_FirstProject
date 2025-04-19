
const productCategory = require("../models/product-category.model")


module.exports.getSubCategory = async (parentId)=>{
    const getCategory = async (parentId)=>{
        const subs = await productCategory.find({
            parent_id: parentId,
            status:"active",
            deleted:false
        });
        
        
        let allSub = [...subs];
    
    
        for(const sub of subs){
            const childs = await getCategory(sub.id);
            allSub = allSub.concat(childs);
        }
        return allSub;
    }

    const result = await getCategory(parentId);
    return result;
}
