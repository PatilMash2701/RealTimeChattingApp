"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const consumer_js_1 = require("./consumer.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
(0, consumer_js_1.startSendOtpConsumer)();
const app = (0, express_1.default)();
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "mail" });
});
const port = Number(process.env.PORT) || 5001;
app.listen(port, "0.0.0.0", () => {
    console.log(`Mail service running on port ${port}`);
});
//# sourceMappingURL=index.js.map