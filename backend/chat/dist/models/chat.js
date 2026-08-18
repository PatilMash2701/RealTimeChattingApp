import mongoose, { Schema } from "mongoose";
const schema = new Schema({
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: String, required: true }],
    latestMessage: {
        text: String,
        sender: String,
    },
    groupAdmin: { type: String },
}, {
    timestamps: true
});
export const Chat = mongoose.model("chat", schema);
//# sourceMappingURL=chat.js.map