import mongoose, { Document } from "mongoose";
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
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=User.d.ts.map