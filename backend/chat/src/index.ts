import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import chatRoute from "./routes/chat.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { app, server } from "./config/socket.js";

dotenv.config();

connectDB();


app.use(express.json());
app.use(cookieParser());

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({
    origin: frontendUrl,
    credentials: true
}));

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "chat" });
});

app.use("/api/v1", chatRoute);

const port = Number(process.env.PORT) || 5082;

server.listen(port, "0.0.0.0", () => {
    console.log(`Chat service running on port ${port}`);
});