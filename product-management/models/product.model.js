const mongoose  = require("mongoose");
const slug = require('mongoose-slug-updater');
mongoose.plugin(slug);

const productSchema = new mongoose.Schema(
    {
        title: String,
        product_category_id:{
            type: String,
            default: ""
        },
        description: String,
        price: Number,
        discountPercentage: Number,
        stock: Number,
        thumbnail: String,
        status: String,
        position: Number,
        slug:{
            type:String,
            slug: "title",
            unique: true // luôn tạo ra 2 title khác nhau
        },
        deleted:{
            type: Boolean,
            default: false,
            
        },
        deleteAt: Date
    },
    {
        timestamps: true  
    }
);

const Product = mongoose.model('Product', productSchema  , "products"); 
module.exports = Product;




