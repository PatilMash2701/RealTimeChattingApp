import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    profilePic?: {
        url: string;
        publicId: string;
    };
    pushSubscriptions?: Array<{
        endpoint: string;
        keys?: {
            p256dh?: string;
            auth?: string;
        };
        expirationTime?: Date | null;
    }>;
}

const schema: Schema<IUser> = new Schema({
    name:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    profilePic:{
        url: String,
        publicId: String
    },
    pushSubscriptions:{
        type: [//this indicates an array......
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
},{
    timestamps: true,
}
);

export const User = mongoose.model<IUser>("User", schema);
