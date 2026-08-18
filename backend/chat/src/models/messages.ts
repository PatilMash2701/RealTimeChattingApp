import mongoose, {Document , Schema, Types} from "mongoose";

export interface IMessage extends Document {
    chatId: Types.ObjectId;
    sender:string;
    text?:string;
    // Plaintext used only for keyword search (client can send unencrypted content for search).
    // The encrypted UI display is kept in `text`.
    searchText?: string;
    image?:{
        url: string;
        publicId: string;
    };
    reactions?: Array<{
        userId: string;
        emoji: string;
    }>;
    replyTo?: {
        messageId: Types.ObjectId;
        text: string;
        sender: string;
    };
    isDeleted?: boolean;
    delivered?: boolean;
    deliveredAt?: Date | null;
    file?:{
        url: string;
        publicId: string;
        name: string;
        size: number;
    };
    messageType: "text" | "image" | "file";
    seen: boolean;
    seenAt?:Date;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IMessage>({
    chatId:{
        type: Schema.Types.ObjectId,
        ref:"Chat",
        required:true
    },
    sender:{
        type: String,
        required:true,
    },
    text:String,
    searchText: String,
    image:{
        url:String,
        publicId:String,
    },
    reactions:{
        type: [
            {
                userId: { type: String, required: true },
                emoji: { type: String, required: true },
            },
        ],
        default: [],
    },
    replyTo:{
        messageId: { type: Schema.Types.ObjectId, ref: "Messages" },
        text: { type: String },
        sender: { type: String },
    },
    isDeleted:{
        type: Boolean,
        default: false,
    },
    file:{
        url:String,
        publicId:String,
        name:String,
        size:Number,
    },
    messageType:{
        type:String,
        enum:["text", "image", "file"],
        default:"text",
    },
    seen:{
        type: Boolean,
        default: false
    },
    seenAt:{
        type: Date,
        default: null
    },
    delivered:{
        type: Boolean,
        default: false,
    },
    deliveredAt:{
        type: Date,
        default: null,
    },
},{
    timestamps:true,
});

// Enable message keyword search within a chat.
schema.index({ searchText: "text" });

export const Messages = mongoose.model<IMessage>("Messages", schema);