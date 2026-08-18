import mongoose, { Schema } from "mongoose";
const schema = new Schema({
    chatId: {
        type: Schema.Types.ObjectId,
        ref: "Chat",
        required: true
    },
    sender: {
        type: String,
        required: true,
    },
    text: String,
    searchText: String,
    image: {
        url: String,
        publicId: String,
    },
    reactions: {
        type: [
            {
                userId: { type: String, required: true },
                emoji: { type: String, required: true },
            },
        ],
        default: [],
    },
    replyTo: {
        messageId: { type: Schema.Types.ObjectId, ref: "Messages" },
        text: { type: String },
        sender: { type: String },
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    file: {
        url: String,
        publicId: String,
        name: String,
        size: Number,
    },
    messageType: {
        type: String,
        enum: ["text", "image", "file"],
        default: "text",
    },
    seen: {
        type: Boolean,
        default: false
    },
    seenAt: {
        type: Date,
        default: null
    },
    delivered: {
        type: Boolean,
        default: false,
    },
    deliveredAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
// Enable message keyword search within a chat.
schema.index({ searchText: "text" });
export const Messages = mongoose.model("Messages", schema);
//# sourceMappingURL=messages.js.map