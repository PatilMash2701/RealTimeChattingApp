import {Server, Socket} from 'socket.io';
import http from 'http';
import express from 'express';
import { Messages } from '../models/messages.js';
import { Chat } from '../models/chat.js';
import { Types } from 'mongoose';

const app = express();

const server = http.createServer(app);

const socketCorsOrigin =
    process.env.FRONTEND_URL ||
    process.env.SOCKET_CORS_ORIGIN ||
    "http://localhost:3000";

const io = new Server(server, {
    cors: {
        origin: socketCorsOrigin,
        methods: ["GET", "POST"],
        credentials: true,
    },
});

//this is the map which suggest which user is online 
const userSocketMap:Record<string, string> = {};

export const getReceiverSocketId = (receiverId: string) => {
    return userSocketMap[receiverId];
};


io.on("connection",(socket: Socket) => {
    console.log("User Connected", socket.id);

    //userId has been sent from the frontend as a query parameter in the socket connection request
    const userId = socket.handshake.query.userId as string | undefined;

    if(userId && userId !== "undefined"){
        userSocketMap[userId] = socket.id;
        console.log(`User ${userId} mapped to scoket ${socket.id}`);
    }

    //whenever new connection estimated the server sends the getOnlineUser to the all clients
    io.emit("getOnlineUser", Object.keys(userSocketMap));

    // Delivered tick: when a user comes online, we check whether they have any messages to come from other sender(means on sender side there is single tick only) 
    // that were sent to them earlier but were still marked as not delivered.
    // We then mark them as delivered in MongoDB and notify the original senders so their
    // front-end can update the message status from single tick to double tick.
    (async () => {
        if (!userId || userId === "undefined") return;
        try {
            // Find all chats this user is part of so we can look for incoming messages.
            const userChats = await Chat.find({ users: userId }).select("_id");
            const userChatIds = userChats.map((c) => c._id);
            if (userChatIds.length === 0) return;

            //ye user jab online aayega tab jo other senders hai(jinhone ne message bheja hai) unke taraf message per double click lao.......

            // Get only unread/incoming messages for this user that are still pending delivery.
            // sender !== userId ensures we only consider messages sent by others.
            const pendingMessages = await Messages.find({
                chatId: { $in: userChatIds }, //$in means find all the messages which are in the userChatIds array
                sender: { $ne: userId }, //$ne means dont include userId
                delivered: false,
            }).select("_id sender chatId");

            if (pendingMessages.length === 0) return;

            // Group message IDs by sender so we can notify each sender individually.
            const bySender: Record<string, string[]> = {};
            const messageIds: string[] = [];
            pendingMessages.forEach((m) => {
                const senderId = m.sender.toString();
                const mid = m._id.toString();
                messageIds.push(mid);
                if (!bySender[senderId]) bySender[senderId] = [];
                bySender[senderId].push(mid);
            });

            // Mark all these messages as delivered now.
            const deliveredAt = new Date();
            await Messages.updateMany(
                { _id: { $in: messageIds } },
                { delivered: true, deliveredAt }
            );

            // For each sender, find whether that sender is currently connected.
            // If connected, send a socket event so their UI updates to delivered state.
            Object.entries(bySender).forEach(([senderId, ids]) => {
                const senderSocketId = getReceiverSocketId(senderId);
                if (senderSocketId) {
                    io.to(senderSocketId).emit("messagesDelivered", {
                        messageIds: ids,
                    });
                }
            });
        } catch (err) {
            console.log("Delivered marking failed:", err);
        }
    })();

    // Join a specific chat room
    socket.on("joinChat", (chatId) => {
        socket.join(chatId);
        console.log(`User ${userId} joined room ${chatId}`);
    });

    // Unified message sending via Socket:means the app sends all message traffic through one central socket event flow instead of handling it in separate ad hoc ways....
    socket.on("send", async (data: { chatId: string, text: string, replyTo?: { messageId: Types.ObjectId; text: string; sender: string } }) => {
        const { chatId, text, replyTo } = data;
        if (!userId || !chatId || !text) return;

        try {
            // Save message to database
            const message = new Messages({
                chatId: new Types.ObjectId(chatId),
                sender: userId,
                text,
                messageType: "text",
                seen: false,
                replyTo,
            });
            const savedMessage = await message.save();

            // Update Chat latest message
            await Chat.findByIdAndUpdate(chatId, {
                latestMessage: {
                    text,
                    sender: userId,
                },
                updatedAt: new Date(),
            });

            // Emit to the room (all members in that room)(this message is only get send to the )
            io.to(chatId).emit("newMessage", savedMessage);
            
            // Also notify participants who might not be in the room (for sidebar/unread updates)
            const chat = await Chat.findById(chatId);
            if (chat) {
                // Mark delivered immediately for 1-to-1 chats when receiver is online.
                if (!chat.isGroupChat) {
                    const otherUserId = chat.users.find((uId: string) => uId.toString() !== userId.toString());
                    if (otherUserId) {
                        const receiverSocketId = getReceiverSocketId(otherUserId.toString());
                        if (receiverSocketId) {
                            const deliveredAt = new Date();
                            await Messages.updateOne(
                                { _id: savedMessage._id },
                                { delivered: true, deliveredAt }
                            );

                            const senderSocketId = getReceiverSocketId(userId.toString());
                            if (senderSocketId) {
                                io.to(senderSocketId).emit("messagesDelivered", {
                                    messageIds: [savedMessage._id.toString()],
                                });
                            }
                        }
                    }
                }

                //for group message we are not focusing on delivered at this time for each user,because it increses the database storage ,we have implemented it for the 1-to-1 only
                chat.users.forEach((uId: string) => {
                    if (uId.toString() !== userId){
                        const rId = getReceiverSocketId(uId.toString());
                        if (rId) {
                            io.to(rId).emit("newMessage", savedMessage);
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Error sending message via socket", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    });

    // Leave a specific chat room
    socket.on("leaveChat", (chatId) => {
        socket.leave(chatId);
        console.log(`User ${userId} left room ${chatId}`);
    });

    // Handle typing events (now includes userId for Group Chat support)
    socket.on("typing", (chatId) => {
        socket.to(chatId).emit("userTyping", { chatId, userId });
    });

    socket.on("stopTyping", (chatId) => {
        socket.to(chatId).emit("userStoppedTyping", { chatId, userId });
    });

    // WebRTC signaling (1:1 audio/video calls)
    const forwardToUser = (
        toUserId: string,
        event: string,
        payload: Record<string, unknown>
    ) => {
        if (!userId || !toUserId) return false;
        const receiverSocketId = getReceiverSocketId(toUserId);
        if (!receiverSocketId) return false;
        // adds fromUserId so the receiver knows who sent it
        io.to(receiverSocketId).emit(event, { fromUserId: userId, ...payload });
        return true;
    };


    socket.on(
        "call:offer",
        (data: {
            toUserId: string;
            offer: object;
            callType: "audio" | "video";
            caller: { _id: string; name: string; profilePic?: { url: string } };
        }) => {
            const { toUserId, offer, callType, caller } = data || {};
            if (!toUserId || !offer) return;
            const delivered = forwardToUser(toUserId, "call:offer", {
                offer,
                callType,
                caller,
            });
            if (!delivered) {
                socket.emit("call:unavailable", { toUserId });
            }
        }
    );

    socket.on(
        "call:answer",
        (data: { toUserId: string; answer: object }) => {
            const { toUserId, answer } = data || {};
            if (!toUserId || !answer) return;
            forwardToUser(toUserId, "call:answer", { answer });
        }
    );

    socket.on(
        "call:ice-candidate",
        (data: { toUserId: string; candidate: object }) => {
            const { toUserId, candidate } = data || {};
            if (!toUserId || !candidate) return;
            forwardToUser(toUserId, "call:ice-candidate", { candidate });
        }
    );

    socket.on("call:reject", (data: { toUserId: string }) => {
        const { toUserId } = data || {};
        if (!toUserId) return;
        forwardToUser(toUserId, "call:reject", {});
    });

    socket.on("call:end", (data: { toUserId: string }) => {
        const { toUserId } = data || {};
        if (!toUserId) return;
        forwardToUser(toUserId, "call:end", {});
    });

    socket.on("call:busy", (data: { toUserId: string }) => {
        const { toUserId } = data || {};
        if (!toUserId) return;
        forwardToUser(toUserId, "call:busy", {});
    });

    // Identity verification: requester asks online partner to verify on their own device
    socket.on(
        "identity:requestVerification",
        (data: {
            toUserId: string;
            chatId: string;
            requesterId: string;
            requesterName: string;
        }) => {
            const { toUserId, chatId, requesterId, requesterName } = data || {};
            if (!toUserId || !chatId || !requesterId) return;

            const targetSocketId = getReceiverSocketId(toUserId);
            if (!targetSocketId) {
                socket.emit("identity:verificationUnavailable", {
                    chatId,
                    reason: "offline",
                });
                return;
            }

            forwardToUser(toUserId, "identity:verificationRequest", {
                fromUserId: requesterId,
                fromUserName: requesterName || "Someone",
                chatId,
                at: Date.now(),
            });
        }
    );

    socket.on(
        "identity:cancelVerification",
        (data: { toUserId: string; chatId: string; requesterId: string; requesterName?: string }) => {
            const { toUserId, chatId, requesterId, requesterName } = data || {};
            if (!toUserId) return;
            forwardToUser(toUserId, "identity:verificationCancelled", {
                chatId,
                fromUserId: requesterId,
                fromUserName: requesterName,
            });
        }
    );

    socket.on(
        "identity:declineVerification",
        (data: {
            toUserId: string;
            chatId: string;
            targetUserId: string;
            targetUserName: string;
        }) => {
            const { toUserId, chatId, targetUserId, targetUserName } = data || {};
            if (!toUserId) return;
            forwardToUser(toUserId, "identity:verificationDeclined", {
                chatId,
                targetUserId,
                targetUserName,
            });
        }
    );

    // Live verification snapshot from partner → requester (ephemeral, not persisted)
    socket.on(
        "identity:shareSnapshot",
        (data: {
            toUserId: string;
            chatId: string;
            snapshot: string;
            matched: boolean;
            confidence: number;
            verifiedByName: string;
        }) => {
            const { toUserId, chatId, snapshot, matched, confidence, verifiedByName } =
                data || {};
            if (!toUserId || !chatId || !snapshot) return;
            forwardToUser(toUserId, "identity:verificationSnapshot", {
                chatId,
                snapshot,
                matched: !!matched,
                confidence: typeof confidence === "number" ? confidence : 0,
                verifiedByName: verifiedByName || "Someone",
                at: Date.now(),
            });
        }
    );

    socket.on("disconnect",() => {
        console.log("User Disconnected", socket.id);
        if(userId && userId !== "undefined"){
            delete userSocketMap[userId];
        }
        io.emit("getOnlineUser", Object.keys(userSocketMap));
    });

    socket.on("connect_error",(error) => {
        console.log("socket connection error", error);
    });
});



export { app, server, io };