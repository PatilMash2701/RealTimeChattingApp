import mongoose from 'mongoose';
const connectDB = async () => {
    const url = process.env.MONGO_URI;
    if (!url) {
        throw new Error("MONGO_URI is not defined in environment variables");
    }
    try {
        await mongoose.connect(url, {
            dbName: "Chatappmicroserviceapp"
        });
        console.log("connected to mongodb successfully");
    }
    catch (error) {
        console.error("Failed to connect to MongoDB", error);
        process.exit(1);
    }
};
export default connectDB;
//# sourceMappingURL=db.js.map