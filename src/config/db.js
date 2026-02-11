import mongoose from "mongoose";
import Logger from "../utils/logger.js";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        Logger.success(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        Logger.error("MongoDB Connection Error", error);
        process.exit(1);
    }
};

export default connectDB;
