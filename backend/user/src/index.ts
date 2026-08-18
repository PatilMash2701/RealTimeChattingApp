import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import { createClient } from 'redis';
import userRoutes from './routes/user.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';

dotenv.config();

connectDB();
connectRabbitMQ();

export const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

redisClient
    .connect()
    .then(() => console.log("Connected to Redis"))
    .catch(console.error)

const app = express();

app.use(express.json());
app.use(cookieParser());

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({
    origin: frontendUrl,
    credentials: true
}));

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "user" });
});

app.use("/api/v1", userRoutes);

const port = Number(process.env.PORT) || 5000;

app.listen(port, "0.0.0.0", () => {
    console.log(`User service running on port ${port}`);
});