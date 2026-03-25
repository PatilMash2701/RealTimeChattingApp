"use Client"


import {redirect} from "next/navigation";
import { useAppData, User } from "@/context/AppContext";
import { useRouter } from "next/router";
import React, {useEffect, useState} from "react";
import Loading from "@/components/Loading";
import ChatSidebar from "@/components/chatSidebar";


export interface Message{ //this is message not chat
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  image?:{
    url:string;
    publicId: string;
  }
  messageType: "text" | "image";
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
  const [showAllUser , setShowAllUser] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeOut, setTypingTimeOut] = useState<NodeJS.Timeout | null>(null);


  const router = useRouter();


  useEffect(()=>{
    if(!isAuth && !loading){
       router.push("/login");
    }
  },[isAuth, router, loading]);

  const handleLogout = () => logoutUser();

  if(loading) return <Loading/>

  return  <div className="min-h-screen flex bg-gray-900 text-white relative overflow-hidden">
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
              />
          </div>;
};

export default ChatApp;