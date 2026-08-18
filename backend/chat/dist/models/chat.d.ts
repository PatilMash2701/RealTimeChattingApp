import mongoose, { Document, Types } from "mongoose";
export interface IChat extends Document {
    chatName?: string;
    isGroupChat: boolean;
    users: string[];
    latestMessage: {
        text: string;
        sender: string;
    };
    groupAdmin?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Chat: mongoose.Model<IChat, {}, {}, {}, mongoose.Document<unknown, {}, IChat, {}, mongoose.DefaultSchemaOptions> & IChat & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IChat>;
//# sourceMappingURL=chat.d.ts.map