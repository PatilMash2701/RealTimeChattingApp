import amqp from 'amqplib';
import nodemailer from 'nodemailer';


// Differences vs other connection types:

// HTTP (plain) is transient per request.
// WebSocket / socket.io are persistent client connections (also keep process active).
// AMQP (RabbitMQ) uses a persistent TCP connection that the consumer keeps open.


// Short answer: not automatically — it stays "open" only while the process running startSendOtpConsumer() is alive and connected.

// Details:

// What the code does: startSendOtpConsumer() connects to RabbitMQ, creates a channel, asserts the send-otp queue, then calls channel.consume() to listen indefinitely for messages. While that Node process and AMQP connection are up, the consumer runs continuously.

// When it can stop:
// If the Node process is killed/crashes, the consumer stops.
// If the initial connection fails, the function logs and exits (no retry).
// If the connection drops later, there's no reconnection logic in the current code, so the consumer will stop receiving.

export const startSendOtpConsumer = async() => {
     try{
        const connection =  await amqp.connect({
            protocol: "amqp",
            hostname: process.env.Rabbitmq_Host,
            port: 5672,
            username: process.env.Rabbitmq_Username,
            password: process.env.Rabbitmq_Password,
        })

        const channel = await connection.createChannel()

        const queueName = "send-otp"

        await channel.assertQueue(queueName, { durable:true});

        console.log(" Mail Service consumer started ,listening for otp emails");

        channel.consume(queueName, async(msg)=>{
        if(msg){
            try{
                const {to, subject, body} = JSON.parse(msg.content.toString());

                const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER;
                const smtpPass = process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD;

                if (!smtpUser || !smtpPass) {
                    console.error("SMTP credentials missing (set SMTP_USER and SMTP_PASSWORD)");
                    channel.nack(msg, false, false);
                    return;
                }

                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || "smtp.gmail.com",
                    port: Number(process.env.SMTP_PORT) || 465,
                    secure: process.env.SMTP_SECURE !== "false",
                    auth: {
                        user: smtpUser,
                        pass: smtpPass,
                    },
                });

                await transporter.sendMail({
                    from : "Chat App",
                    to,
                    subject,
                    text : body,
                })
                
                console.log(`OTP mail send to ${to}`);
                channel.ack(msg);
            }catch(error){
                console.log("Failed to send OTP ", error);
            }
        }})
    }catch(error){
            console.log("Failed to start rabbitmq consumer", error);
    }
}