import amqp from 'amqplib';
let channel;
export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect({
            protocol: "amqp",
            hostname: process.env.Rabbitmq_Host,
            port: 5672,
            username: process.env.Rabbitmq_Username,
            password: process.env.Rabbitmq_Password,
        });
        channel = await connection.createChannel();
        console.log("Connected to rabbitMq");
    }
    catch (error) {
        console.log("Failed to connect to rabbitMq");
    }
};
export const publishToQueue = async (queueName, message) => {
    if (!channel) {
        console.log("Rabbitmq Channel is not initialized");
        return;
    }
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
        persistent: true
    });
};
// The publishToQueue function is a crucial part of your Microservices Architecture. It allowed the User Service to talk to the Mail Service without waiting for a response (asynchronous communication).
// Here is a detailed breakdown of how it works and how the channel is accessed:
// 1. How is channel accessed? (Lexical Scoping)
// Look at the top of your rabbitmq.ts file:
// typescript
// // Line 3: Declared at the "Module Level"
// let channel: amqp.Channel; 
// export const connectRabbitMQ = async() => {
//     // ...
//     // Line 15: This function assigns a value to the 'channel' variable
//     channel = await connection.createChannel(); 
// };
// export const publishToQueue = async(queueName: string, message: any) => {
//     // Line 23: This function "looks up" and finds the 'channel' variable 
//     // defined at the top of the file.
//     if(!channel) { ... }
// };
// This is called Lexical Scoping. Because both functions are defined in the same file, they share the channel variable. When connectRabbitMQ (the "initializer") runs at server startup, it fills that empty variable with a live connection. When publishToQueue (the "sender") runs later, it simply uses that already-connected channel.
// 2. From where it takes the value of the "message" (or token)?
// In your code, the message is passed as an argument to the function.
// Example Usage: In your user.ts controller, when you want to send an OTP email, you call it like this:
// typescript
// const otpData = { email: "user@example.com", otp: "123456" };
// await publishToQueue("otp-queue", otpData);
// The otpData object becomes the message inside the function.
// 3. Significance & Working (The Mechanics)
// Here is exactly what the three lines inside the function do:
// await channel.assertQueue(queueName, { durable: true })
// Significance: It’s like a "Safety Check." It says: "Ensure a queue named 'otp-queue' exists. If it doesn't, create it now."
// Durable: This means the Queue is permanent. If the RabbitMQ server restarts, the queue survives.
// Buffer.from(JSON.stringify(message))
// Significance: RabbitMQ doesn't understand JavaScript Objects directly; it only understands Binary/Buffer data (0s and 1s).
// Action: JSON.stringify(message) turns your object into a string, and Buffer.from() turns that string into bytes so it can travel over the network.
// channel.sendToQueue(..., { persistent: true })
// Significance: This is the actual "Push." It places the bytes into the queue.
// Persistent: This tells RabbitMQ to save the message to the hard drive. If the RabbitMQ server crashes after you send the message but before the Mail Service reads it, the message will still be there when the server comes back online.
//# sourceMappingURL=rabbitmq.js.map