"use client";

import { Search, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface ChatMessageSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

const ChatMessageSearch = ({ value, onChange, onClear }: ChatMessageSearchProps) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.trim()) setOpen(true);
  }, [value]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleClear = () => {
    onClear();
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg shrink-0 transition-all hover:scale-105"
        style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}
        aria-label="Search messages"
        title="Search messages"
      >
        <Search className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative flex-1 min-w-0 max-w-[220px] sm:max-w-xs">
      <Search
        className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
        style={{ color: "var(--text-muted)" }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
        placeholder="Search…"
        className="w-full h-7 pl-7 pr-7 text-xs rounded-lg outline-none transition-all"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--accent)";
          e.target.style.boxShadow = "0 0 0 2px var(--accent-soft)";
        }}
      />
      <button
        type="button"
        onClick={handleClear}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-opacity hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
        aria-label="Close search"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ChatMessageSearch;
