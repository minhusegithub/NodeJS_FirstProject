
const productCategory = require("../../models/product-category.model")
const createTreeHelper = require("../../helpers/createTree")

module.exports.category = async (req , res , next)=>{

    const ProductsCategory = await productCategory.find({
        deleted:false
    })
   
    const newProductsCategory = createTreeHelper.tree(ProductsCategory);
    
    res.locals.layoutProductsCategory = newProductsCategory;

    next();
}