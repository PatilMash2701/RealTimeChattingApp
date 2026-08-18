"use client"


import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";


export const user_service = process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:5000"
export const chat_service = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || "http://localhost:5082"

// Set axios to automatically send cookies with every request
axios.defaults.withCredentials = true;

export interface User{
    _id:string;
    name:string;
    email:string;
    profilePic?: {
        url: string;
        publicId: string;
    };
}

export interface Chat{
    _id:string;
    users:string[];
    latestMessage:{
        text: string;
        sender: string;
    }
    isGroupChat: boolean;
    chatName?: string;
    groupAdmin?: string;
    createdAt: string;
    updatedAt: string;
    unseenCount?:number;
}

// Chats is the TypeScript shape for one item in the app's chat list(sidebar).it models what the UI needs to render each conversation entry
//Fields: _id:the chat reacord id , the user: the other paticipant or group metadata), chat: the chat object with chat metadata(latestMessage, isGroupChat,)

export interface Chats{
    _id: string;
    user: User;
    chat: Chat;
}

//in AppContext we have pass the user,loading,isAuth kind of states,and along with them we have pass the statefunction of statecalls too....
interface AppContextType{
    user: User | null;
    loading: boolean;
    isAuth: boolean;
    setUser : React.Dispatch<React.SetStateAction<User | null >>;
    setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
    logoutUser: () => Promise<void>;
    fetchUsers: () => Promise<void>;
    fetchChats: () => Promise<void>;
    updateProfile: (name: string) => Promise<void>;
    updateProfilePic: (formData: FormData) => Promise<void>;
    refreshUser: () => Promise<User | null>;
    chats: Chats[] | null;
    users: User[] | null;
    setChats: React.Dispatch<React.SetStateAction<Chats[] | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
    children : ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuth, setIsAuth] = useState(false);
    const [loading, setLoading] = useState(true);

    async function fetchUser(){
        try{
            const {data} = await axios.get(`${user_service}/api/v1/me`);
            setUser(data);
            setIsAuth(true);
            setLoading(false);
        }catch(error){
            console.log(error);
            setLoading(false);
        }
    }

    /** Reload /me from DB (profile pic, name) — fixes stale JWT user snapshot */
    async function refreshUser(){
        try{
            const {data} = await axios.get(`${user_service}/api/v1/me`);
            setUser(data);
            return data as User;
        }catch(error){
            console.log(error);
            return null;
        }
    }

    async function logoutUser(){
        try {
            await axios.post(`${user_service}/api/v1/logout`);
            setUser(null);
            setIsAuth(false);
            toast.success("User Logged Out");
        } catch (error) {
            console.error("Logout failed", error);
            // Fallback: Clear client state anyway
            setUser(null);
            setIsAuth(false);
        }
    }

    const [chats, setChats] = useState<Chats[] | null>(null);

    async function fetchChats(){
        try{
           const {data} = await axios.get(`${chat_service}/api/v1/chat/${user?._id || "all"}`)

            // Since it's paginated/refactored, it might return just the array now
            setChats(data.chats || data);
           
        }catch(error){
            console.log(error);
        }
    }

    const [users, setUsers] = useState<User[] | null>(null);
    async function fetchUsers(){
        try{
            const {data} = await axios.get(`${user_service}/api/v1/user/all`)
            setUsers(data);
        }catch(error){
            console.log(error);
        }
    }
   
    async function updateProfile(name: string) {
        try {
            const { data } = await axios.post(`${user_service}/api/v1/update/user`, { name });
            setUser(data.user);
            toast.success("Profile updated");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        }
    }

    async function updateProfilePic(formData: FormData) {
        try {
            const { data } = await axios.post(`${user_service}/api/v1/update/profile-pic`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            setUser(data.user);
            toast.success("Profile picture updated");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile picture");
        }
    }

    useEffect(()=> {
        fetchUser()
        fetchChats();
        fetchUsers();
    },[])//only run once when render for first time

    return <AppContext.Provider value={{user, setUser, isAuth, setIsAuth, loading, logoutUser, fetchChats, fetchUsers, updateProfile, updateProfilePic, refreshUser, chats, users, setChats}}>
                {children}
                <Toaster
                  position="top-center"
                  toastOptions={{
                    style: {
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      boxShadow: "var(--shadow-card)",
                    },
                  }}
                />
            </AppContext.Provider>
}

// export const useAppData = (): AppContextType => {
//     const context = useContext(AppContext);
//     if(!context){
//         throw new Error("useappdata must be used within AppProvider")
//     }
// }

export const useAppData = (): AppContextType => {
    const context = useContext(AppContext);

    if(!context){
        throw new Error("useappdata must be used within AppProvider")
    }

    return context;
}