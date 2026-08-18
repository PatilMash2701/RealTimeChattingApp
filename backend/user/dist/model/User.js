import mongoose, { Schema } from "mongoose";
const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    profilePic: {
        url: String,
        publicId: String
    },
    pushSubscriptions: {
        type: [
            {
                endpoint: { type: String, required: true },
                keys: {
                    p256dh: { type: String },
                    auth: { type: String },
                },
                expirationTime: { type: Date, default: null },
            }
        ],
        default: [],
    }
}, {
    timestamps: true,
});
export const User = mongoose.model("User", schema);
//# sourceMappingURL=User.js.map