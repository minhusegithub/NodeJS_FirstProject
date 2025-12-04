//nhung mongoose
const mongoose = require("mongoose");

//Ket noi Mongoose
module.exports.connect = async ()=>{
    try{
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB successfully!");
    } catch(error){
        console.log("Connect error !");
    }
}
