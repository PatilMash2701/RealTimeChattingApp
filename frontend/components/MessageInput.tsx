import { Loader2, Send, X, Paperclip } from "lucide-react";
import React, { useState } from "react";

interface MessageInputProps {
  selectedUser: string | null;
  message: string;
  setMessage: (message: string) => void;
  handleMessageSend: (e: any, attachmentFile?: File | null) => void;
  replyTo?: {
    messageId: string;
    text: string;
    sender: string;
  } | null;
  onCancelReply?: () => void;
}

const MessageInput = ({
  selectedUser,
  message,
  setMessage,
  handleMessageSend,
  replyTo,
  onCancelReply,
}: MessageInputProps) => {
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!message.trim() && !attachmentFile) return;
    setIsUploading(true);
    await handleMessageSend(e, attachmentFile);
    setAttachmentFile(null);
    setIsUploading(false);
  };

  if (!selectedUser) return null;
  const isImage = attachmentFile?.type?.startsWith("image/");

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 pt-3 mt-2 shrink-0 glass-card rounded-2xl p-3"
    >
      {replyTo && (
        <div
          className="rounded-xl px-3 py-2.5 flex items-start justify-between gap-3"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              Replying to {replyTo.sender}
            </p>
            <p className="text-sm truncate italic" style={{ color: "var(--text-secondary)" }}>
              {replyTo.text}
            </p>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="shrink-0 p-1.5 rounded-full transition-colors hover:opacity-80"
              style={{ background: "var(--bg-input)" }}
              aria-label="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {attachmentFile && isImage && (
        <div className="relative w-fit">
          <img
            src={URL.createObjectURL(attachmentFile)}
            alt="preview"
            className="w-20 h-20 object-cover rounded-xl"
            style={{ border: "2px solid var(--border)" }}
          />
          <button
            type="button"
            className="absolute -top-1.5 -right-1.5 p-1 rounded-full text-white"
            style={{ background: "var(--danger)" }}
            onClick={() => setAttachmentFile(null)}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {attachmentFile && !isImage && (
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
        >
          <Paperclip className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <span className="text-sm truncate flex-1">{attachmentFile.name}</span>
          <button
            type="button"
            onClick={() => setAttachmentFile(null)}
            className="p-1 rounded-full hover:opacity-80"
            aria-label="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label
          className="cursor-pointer p-2.5 rounded-xl transition-all hover:scale-105 shrink-0"
          style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
        >
          <Paperclip size={18} />
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAttachmentFile(file);
            }}
          />
        </label>

        <input
          type="text"
          className="input-field flex-1 rounded-full py-2.5 text-sm"
          placeholder={attachmentFile ? "Add a caption…" : "Type a message…"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="submit"
          disabled={(!attachmentFile && !message) || isUploading}
          className="p-2.5 rounded-xl text-white shrink-0 transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
            boxShadow: "0 4px 16px var(--accent-glow)",
          }}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
