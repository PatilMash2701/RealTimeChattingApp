"use client";

import React, { useState } from "react";
import { User, Chat, chat_service } from "@/context/AppContext";
import {
  X,
  UserMinus,
  UserPlus,
  Shield,
  Edit2,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  ChevronRight,
  LogOut,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import ImageModal from "./ImageModal";
import { SocketData } from "@/context/SocketContext";

interface ChatInfoProps {
  chat: Chat;
  loggedInUser: User | null;
  allUsers: User[] | null;
  messages: any[];
  onClose: () => void;
  onUpdate: () => Promise<void>;
}

const ChatInfo = ({
  chat,
  loggedInUser,
  allUsers,
  messages,
  onClose,
  onUpdate,
}: ChatInfoProps) => {
  const [activeTab, setActiveTab] = useState<"info" | "media" | "links">("info");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(chat.chatName || "");
  const [loading, setLoading] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { onlineUsers } = SocketData();
  const otherUserId = !chat.isGroupChat
    ? chat.users.find((id) => id.toString() !== loggedInUser?._id?.toString())
    : null;
  const isContactOnline = otherUserId ? onlineUsers.includes(otherUserId.toString()) : false;
  const isAdmin = chat.groupAdmin === loggedInUser?._id;

  const mediaMessages = messages.filter((m) => m.messageType === "image");
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const linkMessages = messages.filter((m) => m.text && linkRegex.test(m.text));

  const handleRename = async () => {
    if (!newName.trim() || newName === chat.chatName) {
      setIsEditingName(false);
      return;
    }
    try {
      await axios.put(`${chat_service}/api/v1/groups/${chat._id}/rename`, { name: newName });
      toast.success("Group renamed");
      setIsEditingName(false);
      onUpdate();
    } catch {
      toast.error("Failed to rename group");
    }
  };

  const handleAddUser = async (userId: string) => {
    setLoading(true);
    try {
      await axios.post(`${chat_service}/api/v1/groups/${chat._id}/add`, { userIdToAdd: userId });
      toast.success("User added");
      onUpdate();
    } catch {
      toast.error("Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!isAdmin && userId !== loggedInUser?._id) return;
    setLoading(true);
    try {
      await axios.post(`${chat_service}/api/v1/groups/${chat._id}/remove`, {
        userIdToRemove: userId,
      });
      toast.success(userId === loggedInUser?._id ? "Left group" : "User removed");
      onUpdate();
      if (userId === loggedInUser?._id) onClose();
    } catch {
      toast.error("Failed to remove user");
    } finally {
      setLoading(false);
    }
  };

  const usersNotInGroup =
    allUsers?.filter(
      (u) => !chat.users.includes(u._id) && u.name.toLowerCase().includes("")
    ) || [];
  const participants = allUsers?.filter((u) => chat.users.includes(u._id)) || [];

  const tabClass = (tab: typeof activeTab) =>
    `flex-1 py-4 text-sm font-semibold transition-all ${
      activeTab === tab ? "gradient-text" : ""
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end backdrop-blur-sm p-4 sm:p-0"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <ImageModal isOpen={!!previewImage} url={previewImage || ""} onClose={() => setPreviewImage(null)} />

      <div
        className="w-full sm:w-[400px] h-full flex flex-col animate-fade-up"
        style={{
          background: "var(--bg-elevated)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="p-5 flex items-center gap-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">
            {chat.isGroupChat ? "Group info" : "Contact info"}
          </h2>
        </div>

        <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
          {(["info", "media", "links"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={tabClass(tab)}
              style={
                activeTab === tab
                  ? { borderBottom: "2px solid var(--accent)", background: "var(--accent-soft)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {tab === "info" ? "Overview" : tab === "media" ? `Media (${mediaMessages.length})` : `Links (${linkMessages.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll">
          {activeTab === "info" && (
            <div className="p-6 space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div
                  className="w-28 h-28 rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    background: chat.isGroupChat
                      ? "linear-gradient(135deg, #6366f1, #a855f7)"
                      : "var(--bg-input)",
                    border: "3px solid var(--border)",
                  }}
                >
                  {chat.isGroupChat ? (
                    <ImageIcon className="w-10 h-10 text-white/60" />
                  ) : (
                    <span className="text-4xl font-bold gradient-text">
                      {chat.chatName?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="w-full">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="input-field text-center max-w-[200px]"
                        autoFocus
                      />
                      <button
                        onClick={handleRename}
                        className="p-2 rounded-xl text-white"
                        style={{ background: "var(--success)" }}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-xl font-bold">{chat.chatName}</h3>
                      {isAdmin && (
                        <button onClick={() => setIsEditingName(true)} style={{ color: "var(--text-muted)" }}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-sm">
                    {chat.isGroupChat ? (
                      <span style={{ color: "var(--text-muted)" }}>{chat.users.length} members</span>
                    ) : isContactOnline ? (
                      <span className="font-semibold flex items-center justify-center gap-1" style={{ color: "var(--success)" }}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
                        Online
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Offline</span>
                    )}
                  </p>
                </div>
              </div>

              {chat.isGroupChat && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <h4
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Participants
                    </h4>
                    {isAdmin && (
                      <button
                        onClick={() => setIsGroupMode(!isGroupMode)}
                        className="text-xs font-semibold flex items-center gap-1"
                        style={{ color: "var(--accent)" }}
                      >
                        <UserPlus className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {participants.map((u) => {
                      const isParticipantOnline = onlineUsers.includes(u._id);
                      return (
                        <div
                          key={u._id}
                          className="flex items-center justify-between p-3 rounded-xl group transition-all"
                          style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                                {u.profilePic?.url ? (
                                  <img src={u.profilePic.url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                                    {u.name[0]}
                                  </span>
                                )}
                              </div>
                              {isParticipantOnline && (
                                <span
                                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2"
                                  style={{ background: "var(--success)", boxShadow: "0 0 0 2px var(--bg-elevated)" }}
                                />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{u.name}</span>
                                {chat.groupAdmin === u._id && (
                                  <Shield className="w-3 h-3" style={{ color: "var(--accent)" }} />
                                )}
                              </div>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                {u.email}
                              </span>
                            </div>
                          </div>
                          {isAdmin && u._id !== chat.groupAdmin && (
                            <button
                              onClick={() => handleRemoveUser(u._id)}
                              className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              style={{ color: "var(--danger)" }}
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleRemoveUser(loggedInUser!._id)}
                className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  background: "rgba(244, 63, 94, 0.12)",
                  color: "var(--danger)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                }}
              >
                <LogOut className="w-5 h-5" />
                {chat.isGroupChat ? "Exit group" : "Delete chat"}
              </button>
            </div>
          )}

          {activeTab === "media" && (
            <div className="p-4 grid grid-cols-3 gap-2">
              {mediaMessages.map((m, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform"
                  style={{ border: "1px solid var(--border)" }}
                  onClick={() => setPreviewImage(m.image?.url)}
                >
                  <img src={m.image?.url} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
              {mediaMessages.length === 0 && (
                <div className="col-span-3 py-16 flex flex-col items-center" style={{ color: "var(--text-muted)" }}>
                  <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-sm">No media shared yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "links" && (
            <div className="p-4 space-y-2">
              {linkMessages.map((m, i) => {
                const urlMatch = m.text.match(linkRegex);
                return urlMatch?.map((url: string, j: number) => (
                  <a
                    key={`${i}-${j}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl transition-all group"
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors group-hover:text-white"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--accent)" }}>
                        {url}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        From {m.sender === loggedInUser?._id ? "You" : "Them"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                  </a>
                ));
              })}
              {linkMessages.length === 0 && (
                <div className="py-16 flex flex-col items-center" style={{ color: "var(--text-muted)" }}>
                  <LinkIcon className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-sm">No links shared yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-[60]" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div
            className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
        </div>
      )}
    </div>
  );
};

export default ChatInfo;
