import express from 'express';
import {startSendOtpConsumer} from './consumer.js';
import dotenv from 'dotenv';



dotenv.config();

startSendOtpConsumer();

const app = express();

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
})