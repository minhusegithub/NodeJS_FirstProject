//nhung mongoose
import mongoose from 'mongoose';

//Ket noi Mongoose
export const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB successfully!");
    } catch (error) {
        console.log("Connect error !");
    }
}
