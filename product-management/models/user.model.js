const mongoose = require("mongoose");
const generate = require("../helpers/generate") 


const userSchema = new mongoose.Schema(
    {
        fullName: String,
        email: String,
        password: String,
        tokenUser:{
            type: String,
            default: generate.generateRandomString(20)  
        },
        phone: String,
        avatar: {
            type: String,
            default: "https://robohash.org/test.png"
        },
        friendList:[
            {
                user_id: String,
                room_chat_id: String,
            }
        ], // mảng những user đã kết bạn
        acceptFriends: Array,   // mảng những user đã gửi lời mời kết bạn cho mình
        requestFriends: Array, // mảng những user mình đã gửi lời mời kết bạn
        statusOnline:String,
        status:{
            type: String,
            default: "active"
        },
        deleted:{
            type: Boolean,
            default: false, 
        },
        deleteAt: Date,
    },
    {
        timestamps: true  
    }
);

const User = mongoose.model('User', userSchema  , "users"); 
module.exports = User;




