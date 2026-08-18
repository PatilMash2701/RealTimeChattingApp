import mongoose , {Document, Schema, Types} from "mongoose";

export interface IChat extends Document {
    chatName?: string;
    isGroupChat: boolean;
    users: string[]; 
    // latestMessage is an object that contains the text and sender of the latest message in the chat. It is used to display a preview of the latest message in the chat list(in chat we show the latest message and its sender as in whatsApp).
    latestMessage:{
        text: string;
        sender: string;
    };
    groupAdmin?: string;

    createdAt: Date;
    updatedAt: Date;
}

const schema: Schema<IChat> = new Schema({
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    users:[{ type: String, required:true}],
    latestMessage:{
       text: String,
       sender: String,
    },
    groupAdmin: { type: String },
},{
    timestamps:true
})

export const Chat = mongoose.model<IChat>("chat", schema);