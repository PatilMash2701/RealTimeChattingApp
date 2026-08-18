import { chat_service, User } from "@/context/AppContext";
import { APP_NAME } from "@/lib/brand";
import {
  Check,
  CornerDownLeft,
  CornerUpLeft,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  UserCircle,
  Users,
  X,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import ImageModal from "./ImageModal";
import axios from "axios";
import toast from "react-hot-toast";
import { SocketData } from "@/context/SocketContext";

interface ChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showAllUsers: boolean;
  setShowAllUsers: (show: boolean | ((prev: boolean) => boolean)) => void;
  users: User[] | null;
  loggedInUser: User | null;
  chats: any[] | null;
  selectedUser: string | null;
  setSelectedUser: (userId: string | null) => void;
  handleLogout: () => void;
  createChat: (user: User) => void;
  fetchChats: () => Promise<void>;
}

const ChatSidebar = ({
  sidebarOpen,
  setShowAllUsers,
  setSidebarOpen,
  showAllUsers,
  users,
  loggedInUser,
  chats,
  selectedUser,
  setSelectedUser,
  handleLogout,
  createChat,
  fetchChats,
}: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { onlineUsers } = SocketData();

  const toggleUserSelection = (userId: string) => {
    if (selectedGroupUsers.includes(userId)) {
      setSelectedGroupUsers(selectedGroupUsers.filter((id) => id !== userId));
    } else {
      setSelectedGroupUsers([...selectedGroupUsers, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return toast.error("Please enter a group name");
    if (selectedGroupUsers.length < 2) return toast.error("Select at least 2 users");

    try {
      const { data } = await axios.post(`${chat_service}/api/v1/groups/create`, {
        name: groupName,
        users: selectedGroupUsers,
      });
      setSelectedUser(data._id);
      setIsGroupMode(false);
      setShowAllUsers(false);
      setGroupName("");
      setSelectedGroupUsers([]);
      await fetchChats();
      toast.success("Group created!");
    } catch {
      toast.error("Failed to create group");
    }
  };

  return (
    <>
      <ImageModal isOpen={!!previewImage} url={previewImage || ""} onClose={() => setPreviewImage(null)} />
      <aside
        className={`fixed z-20 sm:static top-0 left-0 h-screen w-[360px] min-w-[300px] max-w-[360px] transform flex flex-col transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } sm:translate-x-0`}
        style={{
          background: "var(--bg-elevated)",
          borderRight: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="sm:hidden flex justify-end mb-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
                }}
              >
                {showAllUsers ? (
                  <MessageCircle className="w-5 h-5 text-white" />
                ) : (
                  <Zap className="w-5 h-5 text-white fill-white/20" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {showAllUsers ? (isGroupMode ? "New group" : "New chat") : "Chats"}
                </h2>
                {!showAllUsers && (
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                    {APP_NAME}
                  </p>
                )}
              </div>
            </div>

            <button
              className="p-2.5 rounded-xl text-white text-sm font-medium transition-all hover:scale-105"
              style={{
                background: showAllUsers
                  ? "var(--danger)"
                  : "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
              }}
              onClick={() => {
                setShowAllUsers((prev) => !prev);
                setIsGroupMode(false);
              }}
            >
              {showAllUsers ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {showAllUsers ? (
            <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setIsGroupMode(!isGroupMode)}
                  className="text-xs font-semibold flex items-center gap-2 px-3 py-2 rounded-full transition-all"
                  style={
                    isGroupMode
                      ? {
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent)",
                        }
                      : {
                          background: "var(--bg-input)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }
                  }
                >
                  <Users className="w-3.5 h-3.5" />
                  {isGroupMode ? "1-on-1 chat" : "Group chat"}
                </button>
                {isGroupMode && selectedGroupUsers.length > 0 && (
                  <button
                    onClick={handleCreateGroup}
                    className="text-xs font-bold text-white px-3 py-2 rounded-full"
                    style={{ background: "var(--success)" }}
                  >
                    Create ({selectedGroupUsers.length})
                  </button>
                )}
              </div>

              {isGroupMode && (
                <input
                  type="text"
                  placeholder="Group name…"
                  className="input-field text-sm"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              )}

              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="text"
                  placeholder="Search users…"
                  className="input-field pl-10 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pb-4 custom-scroll">
                {users
                  ?.filter(
                    (u) =>
                      u._id !== loggedInUser?._id &&
                      u.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((u) => {
                    const isSelected = selectedGroupUsers.includes(u._id);
                    const isOnline = onlineUsers.includes(u._id);
                    return (
                      <button
                        key={u._id}
                        className="w-full text-left p-3 rounded-xl transition-all"
                        style={{
                          background: isSelected ? "var(--accent-soft)" : "transparent",
                          border: isSelected
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border)",
                        }}
                        onClick={() => (isGroupMode ? toggleUserSelection(u._id) : createChat(u))}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div
                              className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
                              style={{ background: "var(--bg-input)" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                u.profilePic?.url && setPreviewImage(u.profilePic.url);
                              }}
                            >
                              {u.profilePic?.url ? (
                                <img
                                  src={u.profilePic.url}
                                  alt={u.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <UserCircle className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
                              )}
                            </div>
                            {isSelected && (
                              <div
                                className="absolute -top-1 -right-1 rounded-full p-0.5"
                                style={{ background: "var(--accent)" }}
                              >
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {isOnline && (
                              <span
                                className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2"
                                style={{ background: "var(--success)", boxShadow: "0 0 0 2px var(--bg-elevated)" }}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium block truncate">{u.name}</span>
                            <span className="text-xs block truncate" style={{ color: "var(--text-muted)" }}>
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          ) : chats && chats.length > 0 ? (
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scroll">
              {chats.map((chat) => {
                const latestMessage = chat.chat.latestMessage;
                const isSelected = selectedUser === chat.chat._id;
                const isSentByMe = latestMessage?.sender === loggedInUser?._id;
                const unseenCount = chat.chat.unseenCount || 0;
                const isGroup = chat.chat.isGroupChat;
                const isChatUserOnline =
                  !isGroup && chat.user && onlineUsers.includes(chat.user._id);

                return (
                  <button
                    key={chat.chat._id}
                    onClick={() => {
                      setSelectedUser(chat.chat._id);
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left p-3.5 rounded-xl transition-all"
                    style={
                      isSelected
                        ? {
                            background:
                              "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
                            boxShadow: "0 4px 20px var(--accent-glow)",
                          }
                        : {
                            border: "1px solid transparent",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = "var(--accent-soft)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center ${
                            isGroup ? "" : "cursor-pointer"
                          }`}
                          style={{
                            background: isGroup
                              ? "linear-gradient(135deg, #6366f1, #a855f7)"
                              : "var(--bg-input)",
                          }}
                          onClick={(e) => {
                            if (!isGroup && chat.user.profilePic?.url) {
                              e.stopPropagation();
                              setPreviewImage(chat.user.profilePic.url);
                            }
                          }}
                        >
                          {isGroup ? (
                            <Users className="w-6 h-6 text-white" />
                          ) : chat.user.profilePic?.url ? (
                            <img
                              src={chat.user.profilePic.url}
                              alt={chat.user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserCircle className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
                          )}
                        </div>
                        {isChatUserOnline && (
                          <span
                            className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2"
                            style={{ background: "var(--success)", boxShadow: "0 0 0 2px var(--bg-elevated)" }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={`font-semibold truncate text-sm ${isSelected ? "text-white" : ""}`}
                          >
                            {chat.user.name}
                          </span>
                          {unseenCount > 0 && (
                            <div
                              className="text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                              style={{ background: "var(--danger)" }}
                            >
                              {unseenCount > 99 ? "99+" : unseenCount}
                            </div>
                          )}
                        </div>
                        {latestMessage ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isSentByMe ? (
                              <CornerUpLeft
                                size={11}
                                className={isSelected ? "text-white/70" : ""}
                                style={!isSelected ? { color: "var(--text-muted)" } : undefined}
                              />
                            ) : (
                              <CornerDownLeft
                                size={11}
                                style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "var(--accent)" }}
                              />
                            )}
                            <span
                              className="text-xs truncate flex-1"
                              style={{
                                color: isSelected ? "rgba(255,255,255,0.85)" : "var(--text-muted)",
                              }}
                            >
                              {latestMessage.text}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] italic" style={{ color: "var(--text-muted)" }}>
                            No messages yet
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div
                className="p-6 rounded-3xl mb-4"
                style={{ background: "var(--accent-soft)" }}
              >
                <MessageCircle className="w-10 h-10" style={{ color: "var(--accent)" }} />
              </div>
              <p className="font-medium">No conversations yet</p>
              <p className="text-xs mt-2 px-6 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Tap + to start a chat or create a group
              </p>
            </div>
          )}

          <div className="p-4 glass-panel rounded-none" style={{ borderTop: "1px solid var(--border)" }}>
            <a
              href="/profile"
              className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all group mb-1"
              style={{ border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-soft)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div
                className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
                }}
              >
                {loggedInUser?.profilePic?.url ? (
                  <img src={loggedInUser.profilePic.url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {loggedInUser?.name?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{loggedInUser?.name}</p>
                <p className="text-[10px] group-hover:opacity-80" style={{ color: "var(--accent)" }}>
                  View profile
                </p>
              </div>
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors"
              style={{ color: "var(--danger)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(244, 63, 94, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium text-sm">Sign out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default ChatSidebar;
