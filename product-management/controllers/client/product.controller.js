const Product = require("../../models/product.model");

// [GET] /products
module.exports.index = async (req , res) => {
    const products = await Product.find({// tim tat ca object thoa man
       
    }).sort({position: "desc"});

    const newProduct = products.map(item =>{
        item.priceNew =  (item.price*(100- item.discountPercentage)/100 ).toFixed(2);
        return item;
    });


    // console.log(newProduct);
    
    // Tra ve Views
    res.render("client/pages/products/index" , {
        pageTitle: "Trang danh sach san pham",
        products: newProduct
    });
}










