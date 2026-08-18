"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSendOtpConsumer = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const startSendOtpConsumer = async () => {
    try {
        const connection = await amqplib_1.default.connect({
            protocol: "amqp",
            hostname: process.env.Rabbitmq_Host,
            port: 5672,
            username: process.env.Rabbitmq_Username,
            password: process.env.Rabbitmq_Password,
        });
        const channel = await connection.createChannel();
        const queueName = "send-otp";
        await channel.assertQueue(queueName, { durable: true });
        console.log(" Mail Service consumer started ,listening for otp emails");
        channel.consume(queueName, async (msg) => {
            if (msg) {
                try {
                    const { to, subject, body } = JSON.parse(msg.content.toString());
                    const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER;
                    const smtpPass = process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD;
                    if (!smtpUser || !smtpPass) {
                        console.error("SMTP credentials missing (set SMTP_USER and SMTP_PASSWORD)");
                        channel.nack(msg, false, false);
                        return;
                    }
                    const transporter = nodemailer_1.default.createTransport({
                        host: process.env.SMTP_HOST || "smtp.gmail.com",
                        port: Number(process.env.SMTP_PORT) || 465,
                        secure: process.env.SMTP_SECURE !== "false",
                        auth: {
                            user: smtpUser,
                            pass: smtpPass,
                        },
                    });
                    await transporter.sendMail({
                        from: "Chat App",
                        to,
                        subject,
                        text: body,
                    });
                    console.log(`OTP mail send to ${to}`);
                    channel.ack(msg);
                }
                catch (error) {
                    console.log("Failed to send OTP ", error);
                }
            }
        });
    }
    catch (error) {
        console.log("Failed to start rabbitmq consumer", error);
    }
};
exports.startSendOtpConsumer = startSendOtpConsumer;
//# sourceMappingURL=consumer.js.map