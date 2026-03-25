import TryCatch from "../config/TryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { Chat } from "../models/chat.js";
import { Messages } from "../models/messages.js";
import axios from "axios";


import { Types } from "mongoose";

export const createNewChat = TryCatch(async(req:AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const {otherUserId} = req.body;

    if(!userId || !otherUserId){
        res.status(400).json({
            message:"UserId and otherUserId are required",
        })
        return;
    }

    const userIdString = userId.toString();
    const existingChat = await Chat.findOne({
        users: {$all: [userIdString, otherUserId], $size:2},
    })

    if(existingChat){
        res.json({
            message: "Chat already exists",
            chatId: existingChat._id
        })
        return;
    }
    const newChat = await Chat.create({
        users:[userIdString, otherUserId]
    })
    res.status(201).json({
        message:"New Chat created",
        chatId: newChat._id
    })
})

export const getAllChats = TryCatch(async(req:AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    if(!userId){
        res.status(401).json({
            message:"userId missing",
        })
        return;
    }

    //returns chat where userId is present on any poisition userId or otherUserId ;
    //Convert userId to string for comparison with stored string IDs
    const userIdString = userId.toString();
    const chats = await Chat.find({users: userIdString}).sort({updatedAt: -1});

    const chatWithUserData = await Promise.all(
        chats.map(async(chat) => {
            const otherUserId = chat.users.find(id => id !== userIdString);

            const unseenCount = await Messages.countDocuments({
                chatId: chat._id,
                sender: {$ne: userId?.toString()},//we want to count only where I am not sender,becuase we get notification when only we got the message from other
                seen:false
            })

            try{
                const {data} = await axios.get(`${process.env.USER_SERVICE_URL}/api/v1/user/${otherUserId}`);
                return {
                    user: data,
                    chat:{
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage || null,
                        unseenCount,
                    }
                }
            }catch(error){
                console.log(error);
                return {
                    user:{_id:otherUserId, name:"Unknown User"},
                    chat:{
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage || null,
                        unseenCount,
                    }
                }
            }
        })
    );

    res.json({
        chats: chatWithUserData
    });
});

export const sendMessage = TryCatch(async(req:AuthenticatedRequest, res) => {
    const senderId = req.user?._id;
    const {chatId, text}=req.body;
    const imageFile = req.file;

    if(!senderId){
        res.status(401).json({
            message:"unauthorized",
        })
        return;
    }

    if(!chatId){
        res.status(401).json({
            message:"chatId requried",
        })
        return;
    }
    
    if(!text && !imageFile){
        res.status(400).json({
            message:"Either text or image is required",
        });
        return;
    }

    const chat = await Chat.findById(new Types.ObjectId(chatId));
    if(!chat){
        res.status(404).json({
            message:"Chat Not Found",
        })
        return;
    }
    const isUserInChat = chat.users.some(
        (id) => id.toString() === senderId?.toString()
    );
    if(!isUserInChat){
        res.status(403).json({
            message:"You are not a participant of this chat",
        })
        return;
    }

    const otherUserId = chat.users.find(
        (userId) => userId.toString() !== senderId.toString()
    );

    if(!otherUserId){
        res.status(401).json({
            message: "No other user",
        })
        return;
    }

    //socket setup



    let messageData: any = {
        chatId : new Types.ObjectId(chatId),
        sender: senderId?.toString(),
        seen:false,
        seenAt:undefined,
    };

    if(imageFile){
        messageData.image={
            url: imageFile.path,
            publicId: imageFile.filename,
        };
        messageData.messageType="image";
        messageData.text= text || "";
    }else{
        messageData.text = text;
        messageData.messageType = "text";
    }
    
    const message = new Messages(messageData);
    const savedMessage = await message.save();

    const latestMessageText= imageFile?"📷 Image": text;
    
    await Chat.findByIdAndUpdate(new Types.ObjectId(chatId),{
        latestMessage:{
            text: latestMessageText,
            sender: senderId?.toString(),
        },
        updatedAt: new Date(),
    },
    { new:true}
    );

    //emit to sockets
    res.status(201).json({
        message:savedMessage,
        sender:senderId
    })
});

export const getMessagesByChat = TryCatch(
    async (req: AuthenticatedRequest, res) => {
        const userId = req.user?._id;
        const chatIdParam = req.params.chatId;

        if(!userId){
            res.status(400).json({
                message:"userId required"
            })
            return;
        }
        if(!chatIdParam || Array.isArray(chatIdParam)){
            res.status(400).json({
                message:"chatId required"
            })
            return;
        }

        const chatObjectId = new Types.ObjectId(chatIdParam);
        const chat = await Chat.findById(chatObjectId);
        if(!chat){
            res.status(404).json({
                message:"chat not found"
            })
            return;
        }

        const isUserInChat = chat.users.some(
            (id) => id.toString() === userId?.toString()
        );
        if(!isUserInChat){
            res.status(403).json({
                message:"You are not a participant of this chat",
            })
            return;
        }

        const messagesToMarkSeen = await Messages.find({
            chatId: chatObjectId,
            sender: {$ne: userId?.toString()},//means messages are coming from other
            seen: false,
        });

        await Messages.updateMany({
            chatId: chatObjectId,
            sender: {$ne: userId?.toString()},//means messages are coming from other
            seen: false,
        },{
            seen:true,
            seenAt: new Date(),
        });

        const messages = await Messages.find({chatId: chatObjectId}).sort({createdAt:1});

        const otherUserId = chat.users.find((id) => id.toString() !== userId?.toString());

        try{
            const {data} = await axios.get(`${process.env.USER_SERVICE_URL}/api/v1/user/${otherUserId}`);

            if(!data){
                res.status(400).json({
                    message:"No other user",
                });
                return;
            }

            //socket work

            res.json({
                messages,
                user: data,
            });
        }catch(error){
            console.log(error);
            res.json({
                messages,
                user: {_id: otherUserId, name:"Unknown user"}
            })
        }
    }
)