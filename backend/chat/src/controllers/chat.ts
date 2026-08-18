import TryCatch from "../config/TryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { Chat } from "../models/chat.js";
import { Messages } from "../models/messages.js";
import axios from "axios";
import { getReceiverSocketId, io } from "../config/socket.js";
import webpush from "../config/webpush.js";

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

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const userIdString = userId.toString();
    const chats = await Chat.find({users: userIdString})
        .sort({updatedAt: -1})
        .skip(skip)
        .limit(Number(limit));

    const chatWithUserData = await Promise.all(
        chats.map(async(chat) => {
            const unseenCount = await Messages.countDocuments({
                chatId: chat._id,
                sender: {$ne: userId?.toString()},
                seen:false
            })

            if (chat.isGroupChat) {
                return {
                    user: { _id: chat._id, name: chat.chatName, isGroup: true },
                    chat: {
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage || null,
                        unseenCount,
                    }
                }
            }
  
            const otherUserId = chat.users.find(id => id !== userIdString);

            try{
                const {data} = await axios.get(`${process.env.USER_SERVICE_URL}/api/v1/user/${otherUserId}`, {
                    timeout: 5000 // 5 second timeout
                });
                if (!data) {
                    console.warn(`User service returned empty data for user ${otherUserId}`);
                    return {
                        user:{_id:otherUserId, name:"Unknown User"},
                        chat:{
                            ...chat.toObject(),
                            latestMessage: chat.latestMessage || null,
                            unseenCount,
                        }
                    }
                }
                return {
                    user: data,
                    chat:{
                        ...chat.toObject(),
                        latestMessage: chat.latestMessage || null,
                        unseenCount,
                    }
                }
            }catch(error){
                const errMsg = error instanceof Error ? error.message : String(error);
                console.error(`Failed to fetch user ${otherUserId} from user service:`, errMsg);
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

    res.json(chatWithUserData);
});

export const sendMessage = TryCatch(async(req:AuthenticatedRequest, res) => {
    const senderId = req.user?._id;
    const {chatId, text, replyTo, searchText}=req.body;
    const uploadedFile = req.file as any;

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
    
    if(!text && !uploadedFile){
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

    let messageData: any = {
        chatId : new Types.ObjectId(chatId),
        sender: senderId?.toString(),
        seen:false,
        seenAt:undefined,
        delivered: false,
        deliveredAt: null,
        isDeleted: false,
        searchText: searchText ?? text,
    };

    let parsedReplyTo = replyTo;
    if (typeof replyTo === "string") {
        try {
            parsedReplyTo = JSON.parse(replyTo);
        } catch {
            parsedReplyTo = null;
        }
    }

    if(parsedReplyTo && parsedReplyTo.messageId && parsedReplyTo.text && parsedReplyTo.sender){
        messageData.replyTo = {
            messageId: parsedReplyTo.messageId,
            text: parsedReplyTo.text,
            sender: parsedReplyTo.sender,
        };
    }

    if(uploadedFile){
        const isImage = uploadedFile.mimetype?.startsWith("image/");

        if(isImage){
            messageData.image={
                url: uploadedFile.path,
                publicId: uploadedFile.filename,
            };
            messageData.messageType="image";
        }else{
            messageData.file={
                url: uploadedFile.path,
                publicId: uploadedFile.filename,
                name: uploadedFile.originalname || uploadedFile.filename,
                size: uploadedFile.size || 0,
            };
            messageData.messageType="file";
        }

        messageData.text= text || "";
    }else{
        messageData.text = text;
        messageData.messageType = "text";
    }
    
    const message = new Messages(messageData);
    const savedMessage = await message.save();

    // If the receiver is already online, mark delivered immediately.
    if(chat && !chat.isGroupChat && otherUserId){
        const receiverSocketId = getReceiverSocketId(otherUserId.toString());
        if(receiverSocketId){
            const deliveredAt = new Date();
            await Messages.updateOne(
                { _id: savedMessage._id },
                { delivered: true, deliveredAt }
            );

            const senderSocketId = getReceiverSocketId(senderId?.toString() || "");
            if(senderSocketId){
                io.to(senderSocketId).emit("messagesDelivered", {
                    messageIds: [savedMessage._id.toString()],
                });
            }
        }
    }

    //when we are not into whatsApp then also we see notification of new messages, so we have to implement that.....
    // Web Push fallback when receiver is offline(offline means not socket connection present).
    // Note: since text may be AES-encrypted on the client, we avoid trying to show plaintext here.
    if (chat && !chat.isGroupChat && otherUserId) {
        const receiverSocketId = getReceiverSocketId(otherUserId.toString());
        const hasVapid =
            Boolean(process.env.VAPID_PUBLIC_KEY) && Boolean(process.env.VAPID_PRIVATE_KEY) && Boolean(process.env.USER_SERVICE_URL);

        if (!receiverSocketId && hasVapid) {
            try {
                const subscriptionRes = await axios.get(
                    `${process.env.USER_SERVICE_URL}/api/v1/user/push-subscription/${otherUserId}`
                );
                const subscription = subscriptionRes.data?.subscription;

                if (subscription) {
                    const senderName = (req.user as any)?.name || "New message";
                    const body =
                        savedMessage.messageType === "image"
                            ? "Sent an image"
                            : savedMessage.messageType === "file"
                                ? "Sent a file"
                                : "New message";

                    await webpush.sendNotification(
                        subscription,
                        JSON.stringify({
                            title: senderName,
                            body,
                        })
                    );
                }
            } catch (err) {
                console.log("Web push failed:", err);
            }
        }
    }

    const isImage = uploadedFile?.mimetype?.startsWith("image/");
    const latestMessageText= uploadedFile ? (isImage ? "📷 Image" : "📎 File") : text;
    
    //change the latest message to display in the chat list, so we have to update the latest message in the chat model  
    await Chat.findByIdAndUpdate(new Types.ObjectId(chatId),{
        latestMessage:{
            text: latestMessageText,
            sender: senderId?.toString(),
        },
        updatedAt: new Date(),
    },
    { new:true}
    );

    // 1. Emit to the room (all members in that room get this for live chat UI)
    io.to(chatId.toString()).emit("newMessage", savedMessage);
    
    // 2. Also emit to individual sockets for sidebar updates (unread counts/previews),
    // but SKIP users who are already in the room (to avoid double-notifying)
    // Actually, Socket.io takes care of most of this, but it's cleaner to handle per-user
    chat.users.forEach((userId) => {
        if (userId.toString() !== senderId.toString()) {
            const receiverSocketId = getReceiverSocketId(userId.toString());
            // Since we can't easily check if a socket is in a room without async overhead,
            // we'll rely on the frontend's duplicate-check (which is already implemented).
            // However, we avoid sending a separate individual 'newMessage' to the SENDER.
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", savedMessage);
            }
        }
    });

    res.status(201).json({
        message:savedMessage,
        sender:senderId
    })
});

export const reactToMessage = TryCatch(async(req:AuthenticatedRequest, res) => {
    const { messageId, emoji } = req.body as { messageId: string; emoji: string };
    const userId = req.user?._id?.toString();

    if(!userId){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if(!messageId || !emoji){
        res.status(400).json({ message: "messageId and emoji are required" });
        return;
    }

    const message = await Messages.findById(messageId);
    if(!message){
        res.status(404).json({ message: "Message not found" });
        return;
    }

    const reactions = message.reactions || [];
    const existing = reactions.find((r) => r.userId === userId && r.emoji === emoji);

    //if already reacted with the same emoji, remove it, otherwise add it
    if(existing){
        await Messages.updateOne(
            { _id: messageId },
            { $pull: { reactions: { userId, emoji } } }
        );
    }else{
        await Messages.updateOne(
            { _id: messageId },
            { $push: { reactions: { userId, emoji } } }
        );
    }

    const updated = await Messages.findById(messageId).select("chatId reactions");
    if (!updated || !updated.chatId) {
        res.status(404).json({ message: "Message not found" });
        return;
    }

    io.to(updated.chatId.toString()).emit("messageReaction", {
        messageId,
        reactions: updated.reactions || [],
    });

    res.json({ success: true });
});

export const deleteMessage = TryCatch(async(req:AuthenticatedRequest, res) => {
    const { messageId } = req.params;
    const userId = req.user?._id?.toString();

    if(!userId){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if(!messageId){
        res.status(400).json({ message: "messageId is required" });
        return;
    }

    const message = await Messages.findById(messageId);
    if(!message){
        res.status(404).json({ message: "Message not found" });
        return;
    }

    if(message.sender !== userId){
        res.status(403).json({ message: "Can only delete your own messages" });
        return;
    }

    // Soft delete: keep record but replace content to avoid broken reply references.
    message.text = "This message was deleted";
    message.image = undefined as any;
    message.file = undefined as any;
    message.isDeleted = true;
    await message.save();

    io.to(message.chatId.toString()).emit("messageDeleted", { messageId });
    res.json({ success: true });
});

export const searchMessages = TryCatch(async(req:AuthenticatedRequest, res) => {
    //kis chatid me search kerna hai....
    const { chatId, query } = req.query as { chatId?: string; query?: string };

    if(!chatId || !query){
        res.status(400).json({ message: "chatId and query are required" });
        return;
    }

    const messages = await Messages.find(
        { chatId: new Types.ObjectId(chatId), $text: { $search: query } },
        { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(20);

    res.json({ messages });
});

export const getMessagesByChat = TryCatch(
    async (req: AuthenticatedRequest, res, next) => {
        const userId = req.user?._id;

        if(!userId){
            res.status(400).json({ message: "userId required" });
            return;
        }

        const { page = 1, limit = 50 } = req.query;
        let chatId: string;
        const rawChatId = req.params.chatId || req.params.groupId;
        if (!rawChatId || Array.isArray(rawChatId)) {
             res.status(400).json({ message: "Valid chatId or groupId required" });
             return;
        }
        chatId = rawChatId;
        
        const skip = (Number(page) - 1) * Number(limit);

        const chatObjectId = new Types.ObjectId(chatId);
        const chat = await Chat.findById(chatObjectId);
        if(!chat){
            res.status(404).json({ message: "chat not found" });
            return;
        }

        const isUserInChat = chat.users.some(
            (id) => id.toString() === userId?.toString()
        );
        if(!isUserInChat){
            res.status(403).json({ message: "You are not a participant of this chat" });
            return;
        }
//whenever you access the messages ,then make them seen true and add seenAt timestamp.....
        await Messages.updateMany({
            chatId: chatObjectId,
            sender: {$ne: userId?.toString()},
            seen: false,
        },{
            seen: true,
            seenAt: new Date(),
        });

        //this search meessage for perticular offset and limit for pagination,so we have to sort the messages in descending order and then reverse it to show the latest message at the bottom of the chat window
        //for each page we are call this function from frontend ,according to the activity of user(means how he is scrolling the chat window)
        const messages = await Messages.find({chatId: chatObjectId})
            .sort({createdAt: -1}) // Sort descending for pagination
            .skip(skip)
            .limit(Number(limit));

        // Re-sort ascending for the UI
        const sortedMessages = messages.reverse();

        const otherUserId = chat.users.find((id) => id.toString() !== userId?.toString());

        try{
            let displayUser = null;
            if (chat.isGroupChat) {
                displayUser = { _id: chat._id, name: chat.chatName, isGroup: true };
            } else {
                try {
                    const {data} = await axios.get(`${process.env.USER_SERVICE_URL}/api/v1/user/${otherUserId}`, {
                        timeout: 5000
                    });
                    if (!data) {
                        console.warn(`User service returned empty data for user ${otherUserId}`);
                        displayUser = { _id: otherUserId, name: "Unknown User" };
                    } else {
                        displayUser = data;
                    }
                } catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    console.error(`Failed to fetch user ${otherUserId}:`, errMsg);
                    displayUser = { _id: otherUserId, name: "Unknown User" };
                }
            }

            res.json({
                messages: sortedMessages,
                user: displayUser,
                chat: chat
            });
        }catch(error){
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error('Error in getMessages:', errMsg);
            res.json({
                messages: sortedMessages,
                user: {_id: otherUserId, name:"Unknown user"},
                chat: chat
            })
        }
    }
)

export const getMessagesBetweenUsers = TryCatch(async(req: AuthenticatedRequest, res, next) => {
    const { userId, receiverId } = req.params;
    const loggedInUser = req.user?._id.toString();

    if (loggedInUser !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    const chat = await Chat.findOne({
        isGroupChat: false,
        users: { $all: [userId, receiverId] }
    });

    if (!chat) {
        res.status(404).json({ message: "Chat not found" });
        return;
    }

    // Reuse getMessagesByChat internal logic or just redirect
    req.params.chatId = chat._id.toString();
    return getMessagesByChat(req, res, next);
});

export const createGroupChat = TryCatch(async(req: AuthenticatedRequest, res) => {
    const { users, name } = req.body;

    //in users the current user is not present ,we have to take it from req.user...

    if (!users || !name) {
        res.status(400).json({ message: "Please fill all the fields" });
        return;
    }

    if (users.length < 2) {
        res.status(400).json({ message: "More than 2 users are required to form a group chat" });
        return;
    }

    const adminId = req.user?._id?.toString();
    if (!adminId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    // Add current user to group
    const participants = [...users, adminId];

    const groupChat = await Chat.create({
        chatName: name,
        users: participants,
        isGroupChat: true,
        groupAdmin: adminId,
    });

    res.status(200).json(groupChat);
});

export const renameGroup = TryCatch(async(req: AuthenticatedRequest, res) => {
    const { chatId, name } = req.body;
    const userId = req.user?._id.toString();

    const chat = await Chat.findById(chatId);
    if (!chat) {
        res.status(404).json({ message: "Chat not found" });
        return;
    }

    if (chat.groupAdmin !== userId) {
        res.status(403).json({ message: "Only admin can rename the group" });
        return;
    }

    const updatedChat = await Chat.findByIdAndUpdate(chatId, { chatName: name }, { new: true });
    res.status(200).json(updatedChat);
});

export const addToGroup = TryCatch(async(req: AuthenticatedRequest, res) => {
    const { userIdToAdd } = req.body;
    const { groupId } = req.params;
    const adminId = req.user?._id.toString();

    const chat = await Chat.findById(groupId);
    if (!chat) {
        res.status(404).json({ message: "Chat not found" });
        return;
    }

    if (chat.groupAdmin !== adminId) {
        res.status(403).json({ message: "Only admin can add members" });
        return;
    }

    const updatedChat = await Chat.findByIdAndUpdate(
        groupId,
        { $addToSet: { users: userIdToAdd } },
        { new: true }
    );
    res.status(200).json(updatedChat);
});

export const removeFromGroup = TryCatch(async(req: AuthenticatedRequest, res) => {
    const { userIdToRemove } = req.body;
    const { groupId } = req.params;
    const adminId = req.user?._id.toString();

    const chat = await Chat.findById(groupId);
    if (!chat) {
        res.status(404).json({ message: "Chat not found" });
        return;
    }

    if (chat.groupAdmin !== adminId) {
        res.status(403).json({ message: "Only admin can remove members" });
        return;
    }

    const updatedChat = await Chat.findByIdAndUpdate(
        groupId,
        { $pull: { users: userIdToRemove } },
        { new: true }
    );
    res.status(200).json(updatedChat);
});