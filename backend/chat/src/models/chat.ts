import mongoose , {Document, Schema, Types} from "mongoose";

export interface IChat extends Document {
    users: string[];
    latestMessage:{
        text: string;
        sender: string;
    };

    createdAt: Date;
    updatedAt: Date;
}

const schema: Schema<IChat> = new Schema({
    users:[{ type: String, required:true}],
    latestMessage:{
       text: String,
       sender: String,
    },
},{
    timestamps:true
})

export const Chat = mongoose.model<IChat>("chat", schema);