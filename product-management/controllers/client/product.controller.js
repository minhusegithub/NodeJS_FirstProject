const Product = require("../../models/product.model");

const productsHelper = require("../../helpers/products");
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

// [GET] /products/:slug
module.exports.detail = async (req , res) => {
    
    try {
        const find = { // tim ra san pham chua xoa , co Id tuong ung
            deleted: false,
            slug :req.params.slug
        };

        const product = await Product.findOne(find);

        console.log(product);

        res.render("client/pages/products/detail" , {
            pageTitle: product.title,
            product: product
        });

   }
    catch (error) {
        res.redirect(`/products`);
    }

   
}








