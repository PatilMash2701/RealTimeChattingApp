"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldAlert, X, Eye } from "lucide-react";
import {
  SNAPSHOT_DISPLAY_SECONDS,
  VerificationSnapshotPayload,
} from "@/lib/identitySnapshot";

interface VerificationSnapshotToastProps {
  payload: VerificationSnapshotPayload;
  onDismiss: () => void;
}

/** One-time 10s view of partner's live verification capture (requester side only) */
export default function VerificationSnapshotToast({
  payload,
  onDismiss,
}: VerificationSnapshotToastProps) {
  const [secondsLeft, setSecondsLeft] = useState(SNAPSHOT_DISPLAY_SECONDS);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    setSecondsLeft(SNAPSHOT_DISPLAY_SECONDS);

    const dismissTimer = window.setTimeout(() => {
      onDismissRef.current();
    }, SNAPSHOT_DISPLAY_SECONDS * 1000);

    const tickTimer = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => {
      window.clearTimeout(dismissTimer);
      window.clearInterval(tickTimer);
    };
  }, [payload.at]);

  return (
    <div
      className="mx-1 mb-2 rounded-2xl overflow-hidden animate-fade-up shrink-0"
      style={{
        border: `2px solid ${payload.matched ? "rgba(34, 197, 94, 0.5)" : "rgba(245, 158, 11, 0.5)"}`,
        boxShadow: "var(--shadow-card)",
        background: "var(--bg-elevated)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: payload.matched ? "rgba(34, 197, 94, 0.12)" : "rgba(245, 158, 11, 0.12)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {payload.matched ? (
            <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold truncate flex items-center gap-1.5">
              <Eye className="w-4 h-4 shrink-0" />
              One-time live proof — {payload.verifiedByName}
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {payload.matched
                ? "Their live face matched their profile photo"
                : "Their live face did NOT match their profile"}
              {" · "}
              {payload.confidence}% · {secondsLeft}s left · view once only
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDismissRef.current()}
          className="p-1.5 rounded-lg shrink-0 hover:opacity-80"
          style={{ color: "var(--text-muted)" }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative bg-black">
        <img
          src={payload.snapshot}
          alt="Partner live verification"
          className="w-full max-h-52 object-contain"
        />
        <div
          className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
          style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
        >
          Live capture from their device
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${(secondsLeft / SNAPSHOT_DISPLAY_SECONDS) * 100}%`,
              background: payload.matched
                ? "linear-gradient(90deg, #22c55e, #4ade80)"
                : "linear-gradient(90deg, #f59e0b, #fbbf24)",
            }}
          />
        </div>
      </div>

      <p className="px-4 py-2 text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
        This image disappears in {secondsLeft}s and cannot be viewed again
      </p>
    </div>
  );
}
