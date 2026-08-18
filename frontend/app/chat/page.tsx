"use client";

import {redirect} from "next/navigation";
import { chat_service, useAppData, User, Chat } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import React, {useCallback, useEffect, useState} from "react";
import Loading from "@/components/Loading";
import ChatSidebar from "@/components/chatSidebar";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import axios from "axios";
import ChatHeader from "@/components/chatHeader";
import ChatMessages from "@/components/chatMessages";
import MessageInput from "@/components/MessageInput";
import { SocketData } from "@/context/SocketContext";
import CryptoJS from "crypto-js";
import VerificationSnapshotToast from "@/components/VerificationSnapshotToast";
import { useIdentityVerification } from "@/context/IdentityVerificationContext";
import IdentityVerificationPendingBanner from "@/components/IdentityVerificationPendingBanner";

const SHARED_SECRET = process.env.NEXT_PUBLIC_SHARED_SECRET || "dev-shared-secret";
const ENCRYPTION_PREFIX = "enc:";

function encryptText(plain: string) {
  return ENCRYPTION_PREFIX + CryptoJS.AES.encrypt(plain, SHARED_SECRET).toString();
}

function decryptText(maybeCipher?: string) {
  if (!maybeCipher || typeof maybeCipher !== "string") return maybeCipher;
  if (!maybeCipher.startsWith(ENCRYPTION_PREFIX)) return maybeCipher;

  try {
    const cipher = maybeCipher.slice(ENCRYPTION_PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(cipher, SHARED_SECRET);
    const decoded = bytes.toString(CryptoJS.enc.Utf8);
    return decoded || maybeCipher;
  } catch {
    return maybeCipher;
  }
}


export interface Message{ //this is message not chat
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  isDeleted?: boolean;
  reactions?: Array<{ userId: string; emoji: string }>;
  replyTo?: {
    messageId: string;
    text: string;
    sender: string;
  };
  delivered?: boolean;
  deliveredAt?: string;
  image?:{
    url:string;
    publicId: string;
  }
  file?:{
    url: string;
    publicId: string;
    name: string;
    size: number;
  }
  messageType: "text" | "image" | "file";
  seen: boolean;
  seenAt?:  string;
  createdAt: string;
}

const ChatApp = () => {
  const {loading, isAuth, logoutUser, chats, user:loggedInUser, users, fetchChats, setChats} = useAppData();

  const [selectedUser , setSelectedUser] = useState<string | null>(null);//may be we use userId here understand
  const [message, setMessage]= useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [user, setUser] = useState<User | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [showAllUser , setShowAllUser] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeOut, setTypingTimeOut] = useState<NodeJS.Timeout | null>(null);
  const [replyTo, setReplyTo] = useState<NonNullable<Message["replyTo"]> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const {
    getSnapshotForChat,
    dismissSnapshotView,
    pendingRequest,
    cancelPendingRequest,
  } = useIdentityVerification();

  const liveVerificationSnapshot = selectedUser
    ? getSnapshotForChat(selectedUser)
    : null;
  const activePending =
    pendingRequest && selectedUser && pendingRequest.chatId === selectedUser
      ? pendingRequest
      : null;
  
  const normalizeIncomingMessage = (m: Message): Message => {
    return {
      ...m,
      text: typeof m.text === "string" ? decryptText(m.text) : m.text,
      replyTo: m.replyTo
        ? {
            ...m.replyTo,
            text: decryptText(m.replyTo.text) || m.replyTo.text,
          }
        : m.replyTo,
    };
  };

  const router = useRouter();

  const {onlineUsers, socket} = SocketData();
  console.log(onlineUsers);

  useEffect(() => {
    socket?.on("newMessage", (newMessage) => {
      const normalizedMessage = normalizeIncomingMessage(newMessage as Message);
      // 1. If it's the active chat, update messages list immediately
      if (newMessage.chatId === selectedUser) {
        setMessages((prev) => {
          const currentMessages = prev || [];
          if (!currentMessages.some((m) => m._id === normalizedMessage._id)) {
            return [...currentMessages, normalizedMessage];
          }
          return currentMessages;
        });

        // 2. Update the sidebar preview LOCALLY to avoid a full fetchChats refresh
        // (Full refresh would show a notification bubble because backend hasn't marked it "seen" yet)
        setChats((prevChats) => {
          if (!prevChats) return prevChats;
          return prevChats.map((c) => {
            if (c.chat._id === newMessage.chatId) {
              return {
                ...c,
                chat: {
                  ...c.chat,
                  latestMessage: {
                      text: normalizedMessage.messageType === "image"
                      ? "📷 Image"
                      : normalizedMessage.messageType === "file"
                        ? "📎 File"
                        : normalizedMessage.text || "",
                      sender: normalizedMessage.sender,
                  },
                  unseenCount: 0 // Keep it 0 since we are looking at it
                }
              };
            }
            return c;
          });
        });
      } else {
        // 3. For all other chats, fetch fresh data (including unseen counts)
        fetchChats();
      }
    });

    socket?.on("messageReaction", (payload: { messageId: string; reactions: Message["reactions"] }) => {
      const { messageId, reactions } = payload || {};
      if (!messageId || !reactions) return;
      setMessages((prev) => {
        if (!prev) return prev;
        return prev.map((m) => (m._id === messageId ? { ...m, reactions } : m));
      });
    });

    socket?.on("messageDeleted", (payload: { messageId: string }) => {
      const { messageId } = payload || {};
      if (!messageId) return;
      setMessages((prev) => {
        if (!prev) return prev;
        return prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                isDeleted: true,
                text: "This message was deleted",
                image: undefined,
                file: undefined,
              }
            : m
        );
      });
    });

    socket?.on("messagesDelivered", (payload: { messageIds: string[] }) => {
      const { messageIds } = payload || {};
      if (!messageIds?.length) return;
      setMessages((prev) => {
        if (!prev) return prev;
        const set = new Set(messageIds);
        return prev.map((m) => (set.has(m._id) ? { ...m, delivered: true } : m));
      });
    });

    return () => {
      socket?.off("newMessage");
      socket?.off("messageReaction");
      socket?.off("messageDeleted");
      socket?.off("messagesDelivered");
    };
  }, [socket, selectedUser, fetchChats]);


  useEffect(()=>{
    if(!isAuth && !loading){
       router.push("/login");
    }
  },[isAuth, router, loading]);

  const handleLogout = () => logoutUser();


  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  async function fetchChat(loadMore = false){
    try{
        const currentPage = loadMore ? page + 1 : 1;
        let url = `${chat_service}/api/v1/${selectedUser}/message?page=${currentPage}&limit=30`;

        const {data} = await axios.get(url);
      
      if (loadMore) {
          const incoming = (data.messages || []).map(normalizeIncomingMessage);
          setMessages((prev) => [...incoming, ...(prev || [])]);
          setPage(currentPage);
      } else {
          setMessages((data.messages || []).map(normalizeIncomingMessage));
          setPage(1);
      }
      
      setHasMore(data.messages?.length === 30);
      setUser(data.user);
      setActiveChat(data.chat);
      await fetchChats();
    }catch(error: any){
        console.error("Fetch chats error:", error);
        toast.error(error.response?.data?.message || "Failed to load messages. Check if Chat Service is running.");
    }
  }

  useEffect(() => {
    if (!selectedUser) return;

    const q = searchQuery.trim();
    if (!q) {
      if (isSearching) {
        setIsSearching(false);
        fetchChat();
      }
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const url = `${chat_service}/api/v1/message/search?chatId=${selectedUser}&query=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url);
        setMessages((data.messages || []).map(normalizeIncomingMessage));
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to search messages");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUser]);

  async function createChat(u: User){
    try{ 
        const { data } = await axios.post(`${chat_service}/api/v1/chat/new`,{
          userId: loggedInUser?._id,
          otherUserId: u._id
        });
        setSelectedUser(data.chatId);
        setShowAllUser(false);
        await fetchChats();

    }catch(error: any){
        console.error("Create chat error:", error);
        toast.error(error.response?.data?.message || "Failed to start chat. Check Chat Service connectivity.");
    }
  }

  const handleMessageSend = async(e:any, attachmentFile?:File | null) => {
    e.preventDefault();

    if(!message.trim() && !attachmentFile) return;

    //socket work 
   socket?.emit("stopTyping", selectedUser);
   if(!selectedUser) return;
   
    try{
       // For all messages, use REST (multer upload for attachments; no file is ok for text-only)
       const formData = new FormData();
       formData.append("chatId", selectedUser);

       if(message.trim()){
        formData.append("text", encryptText(message));
        formData.append("searchText", message);
       }

       if(attachmentFile){
        formData.append("image", attachmentFile)
       }

      if (replyTo) {
        formData.append(
          "replyTo",
          JSON.stringify({
            messageId: replyTo.messageId,
              text: encryptText(replyTo.text),
            sender: replyTo.sender,
          })
        );
      }

       const {data} = await axios.post(`${chat_service}/api/v1/message`, formData, {
        headers:{
          "Content-Type": "multipart/form-data",
        },
       });

       setMessages((prev) => {
            const currentMessages = prev || []
            const messageId = data.message ? data.message._id : data._id; // defensive
            const messageExists = currentMessages.some(
              (msg) => msg._id === messageId
            );

            if(!messageExists){
              return [...currentMessages, data.message || data];
            }
            return currentMessages;
       })
       
       setMessage("");
       setReplyTo(null);

    }catch(error:any){
      toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
    }
  }

  const handleTyping = (value: string) => {
    setMessage(value);

    if(!selectedUser) return;

    socket?.emit("typing", selectedUser);

    if (typingTimeOut) clearTimeout(typingTimeOut);

    setTypingTimeOut(
      setTimeout(() => {
        socket?.emit("stopTyping", selectedUser);
      }, 2000)
    );
  }

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      await axios.post(`${chat_service}/api/v1/message/reaction`, { messageId, emoji });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add reaction");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await axios.delete(`${chat_service}/api/v1/message/${messageId}`);
      // No optimistic update needed; we already listen for socket "messageDeleted"
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  };
  
  useEffect(() => {
    socket?.on("userTyping", (chatId) => {
      if (typeof chatId === "string") {
        if (chatId === selectedUser) setIsTyping(true);
        return;
      }

      // Backend emits { chatId, userId }
      if (chatId && typeof chatId === "object" && "chatId" in chatId) {
        const payload = chatId as { chatId: string; userId?: string };
        if (payload.chatId === selectedUser) setIsTyping(true);
      }
    });

    socket?.on("userStoppedTyping", (chatId) => {
      if (typeof chatId === "string") {
        if (chatId === selectedUser) setIsTyping(false);
        return;
      }

      // Backend emits { chatId, userId }
      if (chatId && typeof chatId === "object" && "chatId" in chatId) {
        const payload = chatId as { chatId: string; userId?: string };
        if (payload.chatId === selectedUser) setIsTyping(false);
      }
    });

    return () => {
      socket?.off("userTyping");
      socket?.off("userStoppedTyping");
    };
  }, [socket, selectedUser]);
  
  useEffect(() => {
    if (socket && selectedUser) {
      socket.emit("joinChat", selectedUser);

      return () => {
        socket.emit("leaveChat", selectedUser);
      };
    }
  }, [socket, selectedUser]);

  useEffect(() =>{
    if(selectedUser){
       fetchChat();
    }
  },[selectedUser]);

  if(loading) return <Loading/>

  return  <div
            className="h-screen flex overflow-hidden"
            style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
          >
              <ChatSidebar 
                  sidebarOpen={sidebarOpen} 
                  setSidebarOpen={setSidebarOpen} 
                  showAllUsers={showAllUser} 
                  setShowAllUsers={setShowAllUser} 
                  users={users} 
                  loggedInUser={loggedInUser} 
                  chats={chats} 
                  selectedUser={selectedUser} 
                  setSelectedUser={setSelectedUser} 
                  handleLogout = {handleLogout}
                  createChat={createChat}
                  fetchChats={fetchChats}
              />
              
              <div
                className="flex-1 flex flex-col h-screen overflow-hidden p-3"
                style={{ backgroundColor: "var(--bg-secondary)" }}
              >
                  {activePending && (
                    <IdentityVerificationPendingBanner
                      pending={activePending}
                      onCancel={cancelPendingRequest}
                    />
                  )}

                  {liveVerificationSnapshot && selectedUser && (
                    <VerificationSnapshotToast
                      payload={liveVerificationSnapshot}
                      onDismiss={() =>
                        dismissSnapshotView(
                          liveVerificationSnapshot.chatId,
                          liveVerificationSnapshot.at
                        )
                      }
                    />
                  )}

                  <ChatHeader
                      user={user}
                      chat={activeChat}
                      messages={messages}
                      loggedInUser={loggedInUser}
                      allUsers={users}
                      fetchChat={fetchChat}
                      setSidebarOpen = {setSidebarOpen}
                      isTyping={isTyping}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      onSearchClear={() => setSearchQuery("")}
                  />

                  <ChatMessages
                      selectedUser={selectedUser}
                      messages={messages}
                      loggedInUser={loggedInUser}
                      hasMore={!isSearching && hasMore}
                      onLoadMore={() => fetchChat(true)}
                      onReply={(m) => {
                        const snapshotText =
                          m.text ||
                          (m.messageType === "image" ? "📷 Image" : m.messageType === "file" ? "📎 File" : "");
                        setReplyTo({
                          messageId: m._id,
                          text: snapshotText,
                          sender: m.sender,
                        });
                      }}
                      onReact={handleReactToMessage}
                      onDelete={handleDeleteMessage}
                  />

                  <MessageInput 
                      selectedUser = {selectedUser} 
                      message={message} 
                      setMessage = {handleTyping} 
                      handleMessageSend={handleMessageSend}
                      replyTo={replyTo}
                      onCancelReply={() => setReplyTo(null)}
                  />
                      
              </div>

              </div>
          
};

export default ChatApp;