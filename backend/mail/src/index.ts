import express from 'express';
import {startSendOtpConsumer} from './consumer.js';
import dotenv from 'dotenv';



dotenv.config();

// Short answer: the HTTP request/response cycle is independent from background workers — the Node process keeps running and can hold other long‑lived connections (like AMQP or WebSocket) concurrently.

// A Node process runs an event loop. Anything that registers active I/O (open TCP sockets, timers, listeners) keeps the process alive waiting for events.
// In your code index.ts calls startSendOtpConsumer() at startup. That function (in consumer.ts) opens a persistent AMQP (TCP) connection and calls channel.consume(...), which registers a callback to run when messages arrive. That open AMQP socket keeps the event loop active even when no HTTP request is in flight.
// Express app.listen(...) separately opens the HTTP server socket and handles transient request/response cycles. Each HTTP request is short‑lived, but the server socket remains open to accept new requests.
// So both run side‑by‑side in the same process: the HTTP server handles web traffic; the AMQP consumer waits for messages independently.

startSendOtpConsumer();

const app = express();

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "mail" });
});

const port = Number(process.env.PORT) || 5001;

app.listen(port, "0.0.0.0", () => {
    console.log(`Mail service running on port ${port}`);
});