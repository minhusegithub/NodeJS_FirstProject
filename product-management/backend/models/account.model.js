import mongoose from 'mongoose';
import * as generateHelper from '../helpers/generate.js';

const accountSchema = new mongoose.Schema(
    {
        fullName: String,
        email: String,
        password: String,
        token: {
            type: String,
            default: generateHelper.generateRandomString(20)
        },
        phone: String,
        avatar: String,
        role_id: String,
        status: String,
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

const Account = mongoose.model("Account", accountSchema, "accounts");

export default Account;
