import mongoose, { Document, Types } from "mongoose";
export interface IMessage extends Document {
    chatId: Types.ObjectId;
    sender: string;
    text?: string;
    searchText?: string;
    image?: {
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
    file?: {
        url: string;
        publicId: string;
        name: string;
        size: number;
    };
    messageType: "text" | "image" | "file";
    seen: boolean;
    seenAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Messages: mongoose.Model<IMessage, {}, {}, {}, mongoose.Document<unknown, {}, IMessage, {}, mongoose.DefaultSchemaOptions> & IMessage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IMessage>;
//# sourceMappingURL=messages.d.ts.map