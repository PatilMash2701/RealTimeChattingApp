import { Message } from "@/app/chat/page";
import { User } from "@/context/AppContext";
import React, { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { Check, CheckCheck, Smile, Trash2 } from "lucide-react";

interface ChatMessagesProps {
  selectedUser: string | null;
  messages: Message[] | null;
  loggedInUser: User | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onReply: (m: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

const ChatMessages = ({
  selectedUser,
  messages,
  loggedInUser,
  hasMore,
  onLoadMore,
  onReply,
  onReact,
  onDelete,
}: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const reactionEmojis = useMemo(() => ["👍", "❤️", "😂", "😮", "😢", "🙏"], []);

  const uniqueMessages = useMemo(() => {
    if (!messages) return [];
    const seen = new Set();
    return messages.filter((message) => {
      if (seen.has(message._id)) return false;
      seen.add(message._id);
      return true;
    });
  }, [messages]);

  const groupedMessages = useMemo(() => {
    const groups: Array<{ label: string; items: Message[] }> = [];
    const labelToIndex = new Map<string, number>();

    uniqueMessages.forEach((msg) => {
      const label = moment(msg.createdAt).calendar(null, {
        sameDay: "[Today]",
        lastDay: "[Yesterday]",
        lastWeek: "dddd",
        sameElse: "MMM D, YYYY",
      });

      const existingIdx = labelToIndex.get(label);
      if (existingIdx === undefined) {
        labelToIndex.set(label, groups.length);
        groups.push({ label, items: [msg] });
      } else {
        groups[existingIdx].items.push(msg);
      }
    });

    return groups;
  }, [uniqueMessages]);

  useEffect(() => {
    if (uniqueMessages.length > 0 && messages?.length && messages.length <= 30) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedUser, uniqueMessages.length]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0 glass-card rounded-2xl">
      <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scroll">
        {hasMore && selectedUser && (
          <div className="flex justify-center py-2">
            <button
              onClick={onLoadMore}
              className="text-xs font-medium px-4 py-2 rounded-full transition-all hover:scale-[1.02]"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
                border: "1px solid var(--border)",
              }}
            >
              Load previous messages
            </button>
          </div>
        )}
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center mt-24 gap-3 px-6 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--accent-soft)" }}
            >
              <Smile className="w-8 h-8" style={{ color: "var(--accent)" }} />
            </div>
            <p className="font-medium" style={{ color: "var(--text-secondary)" }}>
              Select a conversation to start messaging
            </p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider px-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {group.label}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>

                {group.items.map((e) => {
                  const isSentbyMe = loggedInUser ? e.sender === loggedInUser._id : false;
                  const reactions = e.reactions || [];
                  const reactionsByEmoji = reactions.reduce(
                    (acc, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  );

                  return (
                    <div
                      className={`flex flex-col gap-1 mt-2 ${isSentbyMe ? "items-end" : "items-start"}`}
                      key={e._id}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onReply(e)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") onReply(e);
                        }}
                        className={`rounded-2xl px-4 py-2.5 max-w-xs sm:max-w-md shadow-sm cursor-pointer transition-transform hover:scale-[1.01] ${
                          isSentbyMe ? "bubble-sent rounded-br-md" : "bubble-received rounded-bl-md"
                        }`}
                      >
                        {e.replyTo && (
                          <div
                            className="px-2.5 py-1.5 rounded-lg mb-2 text-xs italic"
                            style={{
                              background: isSentbyMe ? "rgba(0,0,0,0.15)" : "var(--accent-soft)",
                              borderLeft: "3px solid var(--accent)",
                              color: isSentbyMe ? "rgba(255,255,255,0.9)" : "var(--text-secondary)",
                            }}
                          >
                            {e.replyTo.text}
                          </div>
                        )}

                        {!e.isDeleted && e.messageType === "image" && e.image && (
                          <img
                            src={e.image.url}
                            alt="shared"
                            className="max-w-full h-auto rounded-xl"
                          />
                        )}

                        {!e.isDeleted && e.messageType === "file" && e.file && (
                          <a
                            href={e.file.url}
                            download={e.file.name}
                            onClick={(ev) => ev.stopPropagation()}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 mt-1"
                            style={{
                              background: isSentbyMe ? "rgba(0,0,0,0.12)" : "var(--bg-input)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <span className="text-sm truncate">{e.file.name}</span>
                            <span className="text-xs opacity-70">
                              {Math.max(1, Math.round(e.file.size / 1024))} KB
                            </span>
                          </a>
                        )}

                        {e.text && (
                          <p className={`whitespace-pre-wrap ${e.image || e.file ? "mt-1.5" : ""}`}>
                            {e.text}
                          </p>
                        )}

                        {Object.keys(reactionsByEmoji).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(reactionsByEmoji).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  onReact(e._id, emoji);
                                }}
                                className="text-xs px-2 py-1 rounded-full transition-colors"
                                style={{
                                  background: isSentbyMe ? "rgba(0,0,0,0.15)" : "var(--bg-input)",
                                  border: "1px solid var(--border)",
                                }}
                              >
                                {emoji} <span className="ml-0.5 opacity-80">{count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div
                          className={`flex items-center gap-1 mt-2 ${isSentbyMe ? "justify-end" : "justify-start"}`}
                        >
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setReactionPickerFor((cur) => (cur === e._id ? null : e._id));
                            }}
                            className="p-1.5 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                            aria-label="React"
                          >
                            <Smile className="w-4 h-4" />
                          </button>
                          {isSentbyMe && !e.isDeleted && (
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (confirm("Delete this message for everyone?")) onDelete(e._id);
                              }}
                              className="p-1.5 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {reactionPickerFor === e._id && (
                          <div
                            className={`mt-2 flex flex-wrap gap-1 ${isSentbyMe ? "justify-end" : "justify-start"}`}
                          >
                            {reactionEmojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  onReact(e._id, emoji);
                                  setReactionPickerFor(null);
                                }}
                                className="text-lg px-2 py-1 rounded-full hover:scale-110 transition-transform"
                                style={{ background: "var(--bg-input)" }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div
                        className={`flex items-center gap-1 text-[10px] px-1 ${isSentbyMe ? "flex-row-reverse" : ""}`}
                        style={{ color: "var(--text-muted)" }}
                      >
                        <span>{moment(e.createdAt).format("hh:mm A · MMM D")}</span>
                        {isSentbyMe && (
                          <div className="flex items-center ml-1">
                            {e.seen ? (
                              <CheckCheck className="w-3 h-3" style={{ color: "var(--accent)" }} />
                            ) : e.delivered ? (
                              <CheckCheck className="w-3 h-3" style={{ color: "var(--success)" }} />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatMessages;
