import React from "react";
import { APP_NAME } from "@/lib/brand";

const Loading = () => {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-6 min-h-screen mesh-bg"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="relative">
        <div
          className="w-14 h-14 rounded-2xl animate-pulse-ring"
          style={{
            background: "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
            boxShadow: "0 8px 32px var(--accent-glow)",
          }}
        />
        <div
          className="absolute inset-0 m-auto w-8 h-8 border-[3px] rounded-full animate-spin"
          style={{
            borderColor: "var(--border-strong)",
            borderTopColor: "var(--accent)",
            width: "2rem",
            height: "2rem",
            top: "50%",
            left: "50%",
            marginTop: "-1rem",
            marginLeft: "-1rem",
          }}
        />
      </div>
      <p className="text-sm font-medium tracking-wide" style={{ color: "var(--text-secondary)" }}>
        Loading {APP_NAME}…
      </p>
    </div>
  );
};

export default Loading;
