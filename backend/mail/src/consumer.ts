import amqp from 'amqplib';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';


dotenv.config({ path: path.resolve(process.cwd(), '../mail/.env') });

console.log('USER:', process.env.USER);
console.log('PASSWORD:', process.env.PASSWORD ? 'loaded' : 'undefined');

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

                const transporter = nodemailer.createTransport({
                    host:"smtp.gmail.com",
                    port:465,
                    auth:{
                        user : process.env.USER,
                        pass : process.env.PASSWORD
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