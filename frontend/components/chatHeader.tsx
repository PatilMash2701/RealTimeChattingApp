import { Chat, User } from "@/context/AppContext";
import { Lock, Menu, Phone, Settings, ShieldCheck, UserCircle, Users, Video } from "lucide-react";
import { useIdentityVerification } from "@/context/IdentityVerificationContext";
import toast from "react-hot-toast";
import React, { useState } from "react";
import ChatInfo from "./ChatInfo";
import ImageModal from "./ImageModal";
import ChatMessageSearch from "./ChatMessageSearch";
import { SocketData } from "@/context/SocketContext";
import { useCall } from "@/context/CallContext";

interface ChatHeaderProps {
  user: any | null;
  chat: Chat | null;
  messages: any[] | null;
  loggedInUser: User | null;
  allUsers: User[] | null;
  fetchChat: (loadMore?: boolean) => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  isTyping: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onSearchClear?: () => void;
}

const ChatHeader = ({
  user,
  chat,
  messages,
  loggedInUser,
  allUsers,
  fetchChat,
  setSidebarOpen,
  isTyping,
  searchQuery = "",
  onSearchChange,
  onSearchClear,
}: ChatHeaderProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const isGroup = chat?.isGroupChat;
  const { onlineUsers } = SocketData();
  const { startCall, callStatus } = useCall();
  const { requestPeerVerification, pendingRequest } = useIdentityVerification();
  const isOnline = !isGroup && user && onlineUsers.includes(user._id);
  const canCall = !isGroup && user && isOnline && callStatus === "idle";
  const verificationPending =
    !isGroup && user && chat && pendingRequest?.chatId === chat._id;

  const handleVerifyClick = () => {
    if (!user || !chat || isGroup) return;
    if (!isOnline) {
      toast.error(`${user.name} is offline. They must be online to verify themselves.`);
      return;
    }
    requestPeerVerification(user, chat._id);
  };

  return (
    <>
      <ImageModal
        isOpen={!!previewImage}
        url={previewImage || ""}
        onClose={() => setPreviewImage(null)}
      />
      <div className="sm:hidden fixed top-4 right-4 z-30">
        <button
          className="p-3 rounded-xl glass-panel transition-all hover:scale-105"
          onClick={() => setSidebarOpen(true)}
          style={{ color: "var(--text-secondary)" }}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-2 glass-card rounded-2xl px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`flex items-center gap-3 flex-1 min-w-0 ${user ? "cursor-pointer group" : ""}`}
            onClick={() => user && setShowInfo(true)}
          >
            {user ? (
              <>
                <div className="relative shrink-0">
                  <div
                    className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{
                      background: isGroup
                        ? "linear-gradient(135deg, #6366f1, #a855f7)"
                        : "var(--bg-input)",
                    }}
                  >
                    {isGroup ? (
                      <Users className="w-5 h-5 text-white" />
                    ) : user.profilePic?.url ? (
                      <img
                        src={user.profilePic.url}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(user.profilePic.url);
                        }}
                      />
                    ) : (
                      <UserCircle className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                    )}
                  </div>
                  {isOnline && (
                    <span
                      className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2"
                      style={{ background: "var(--success)", boxShadow: "0 0 0 2px var(--bg-elevated)" }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold truncate group-hover:opacity-90 transition-opacity">
                    {user.name}
                  </h2>
                  <div className="h-4 flex items-center gap-2 flex-wrap">
                    {isTyping ? (
                      <span className="text-xs font-medium animate-pulse" style={{ color: "var(--accent)" }}>
                        {isGroup ? "Someone is typing…" : "Typing…"}
                      </span>
                    ) : isOnline ? (
                      <span
                        className="text-xs font-semibold flex items-center gap-1"
                        style={{ color: "var(--success)" }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
                        Online
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {isGroup
                          ? `${chat.users.length} members`
                          : "Offline"}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 shrink-0"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Lock className="w-3 h-3" />
                      Encrypted
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--bg-input)" }}
                >
                  <UserCircle className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: "var(--text-muted)" }}>
                    Select a conversation
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Choose a chat from the sidebar
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isGroup && user && (
              <button
                type="button"
                onClick={handleVerifyClick}
                disabled={verificationPending}
                className="p-2 rounded-lg transition-all hover:scale-105 disabled:opacity-40"
                style={{
                  background: "var(--bg-input)",
                  color: isOnline ? "var(--success)" : "var(--text-muted)",
                }}
                title={
                  isOnline
                    ? "Ask them to verify on their device"
                    : "User must be online to verify"
                }
                aria-label="Request identity verification"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
            {canCall && (
              <>
                <button
                  type="button"
                  onClick={() => startCall(user, "audio")}
                  className="p-2 rounded-lg transition-all hover:scale-105"
                  style={{ background: "var(--bg-input)", color: "var(--accent)" }}
                  title="Voice call"
                  aria-label="Start voice call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => startCall(user, "video")}
                  className="p-2 rounded-lg transition-all hover:scale-105"
                  style={{ background: "var(--bg-input)", color: "var(--accent)" }}
                  title="Video call"
                  aria-label="Start video call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </>
            )}
            {user && onSearchChange && onSearchClear && (
              <ChatMessageSearch
                value={searchQuery}
                onChange={onSearchChange}
                onClear={onSearchClear}
              />
            )}
            {isGroup && (
              <button
                onClick={() => setShowInfo(true)}
                className="p-2 rounded-lg transition-all hover:opacity-80"
                style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showInfo && chat && (
        <ChatInfo
          chat={chat}
          loggedInUser={loggedInUser}
          allUsers={allUsers}
          messages={messages || []}
          onClose={() => setShowInfo(false)}
          onUpdate={async () => {
            await fetchChat();
          }}
        />
      )}
    </>
  );
};

export default ChatHeader;
