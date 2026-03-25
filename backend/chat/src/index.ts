import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import chatRoute from "./routes/chat.js";
import cors from "cors";

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

app.use(cors());

app.use("/api/v1", chatRoute);

const port = process.env.PORT;

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})