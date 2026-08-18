import {NextFunction, Request, Response} from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Types } from "mongoose";

interface IUser {
    _id: Types.ObjectId;
    name: string;
    email: string;
}

export interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}

export const isAuth = async(req: AuthenticatedRequest, res: Response, next:NextFunction): Promise<void> => {
    try{
        const token = req.cookies.token;

        if(!token){
            res.status(401).json({
                message: "Please Login- No Token found in cookies"
            })
            return;
        }
        
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

        if(!decodedValue || !decodedValue.user){
            res.status(401).json({
                message: "Invalid Token",
            });
            return;
        }
        req.user = decodedValue.user;
        next();

    }catch(error){
        res.status(401).json({
            message:"Please Login - Invalid token"
        })
    }
}