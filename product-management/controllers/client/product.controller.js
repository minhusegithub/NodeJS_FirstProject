const Product = require("../../models/product.model");

// [GET] /products
module.exports.index = async (req , res) => {
    const products = await Product.find({// tim tat ca object thoa man
       
    }).sort({position: "desc"});

    const newProduct = products.map(item =>{
        item.priceNew =  (item.price*(100- item.discountPercentage)/100 ).toFixed(0);
        return item;
    });


    // console.log(newProduct);
    
    // Tra ve Views
    res.render("client/pages/products/index" , {
        pageTitle: "Trang danh sach san pham",
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








