import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
interface IUser {
    _id: Types.ObjectId;
    name: string;
    email: string;
}
export interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}
export declare const isAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=isAuth.d.ts.map