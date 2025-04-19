const Product = require("../../models/product.model");

const productCategory = require("../../models/product-category.model")

const productsHelper = require("../../helpers/products");

const productsCategoryHelper = require("../../helpers/products-category");

// [GET] /products
module.exports.index = async (req , res) => {
    const products = await Product.find({// tim tat ca object thoa man
       status:"active",
       deleted:false,
    }).sort({position: "desc"});

    const newProduct = productsHelper.priceNewProducts(products);

    
    // Tra ve Views
    res.render("client/pages/products/index" , {
        pageTitle: "Trang danh sách sản phẩm",
        products: newProduct
    });
}

// [GET] /products/:slugCategory
module.exports.category = async (req , res) => {
    
   
    const category = await productCategory.findOne({
        slug: req.params.slugCategory,
        deleted: false
    });


    const listSubCategory = await productsCategoryHelper.getSubCategory(category.id);

    const listSubCategoryId = listSubCategory.map(item => item.id);

    const products = await Product.find({
        product_category_id: { $in: [category.id ,...listSubCategoryId  ] },
        deleted:false
    }).sort({position: "desc"});
    
    const newProduct = productsHelper.priceNewProducts(products);

    res.render("client/pages/products/index" , {
        pageTitle: category.title,
        products: newProduct
    });
   
}

// [GET] /products/detail/:slugProduct
module.exports.detail = async (req , res) => {
    
    try {
        const find = { // tim ra san pham chua xoa ,
            deleted: false,
            slug :req.params.slugProduct,
            status:"active"
        };
       

        const product = await Product.findOne(find);


        if(product.product_category_id){
            const category = await productCategory.findOne({
                _id: product.product_category_id,
                status: "active",
                deleted: false
            });
            product.category = category;
        }

        productsHelper.priceNewProduct(product);

        
        res.render("client/pages/products/detail" , {
            pageTitle: product.title,
            product: product
        });

   }
    catch (error) {
        res.redirect(`/products`);
    }

   
}







