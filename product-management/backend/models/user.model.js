import mongoose from 'mongoose';
import * as generateHelper from '../helpers/generate.js';

const userSchema = new mongoose.Schema(
    {
        fullName: String,
        email: String,
        password: String,
        tokenUser: {
            type: String,
            default: generateHelper.generateRandomString(20)
        },
        phone: String,
        address: String,
        avatar: String,
        status: {
            type: String,
            default: "active"
        },
        requestFriends: Array,
        acceptFriends: Array,
        friendList: [
            {
                user_id: String,
                room_chat_id: String
            }
        ],
        statusOnline: String,
        deleted: {
            type: Boolean,
            default: false
        },
        deletedAt: Date
    },
    {
        timestamps: true
    }
)

const User = mongoose.model("User", userSchema, "users");

export default User;
