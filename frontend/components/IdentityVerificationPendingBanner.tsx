"use client";

import { Loader2, X } from "lucide-react";
import type { PendingVerificationRequest } from "@/lib/identitySnapshot";

interface Props {
  pending: PendingVerificationRequest;
  onCancel: () => void;
}

export default function IdentityVerificationPendingBanner({ pending, onCancel }: Props) {
  return (
    <div
      className="mx-1 mb-2 rounded-xl px-4 py-3 flex items-center justify-between gap-3 shrink-0"
      style={{
        background: "var(--accent-soft)",
        border: "1px solid var(--accent)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Loader2 className="w-5 h-5 animate-spin shrink-0" style={{ color: "var(--accent)" }} />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            Waiting for {pending.targetUserName} to verify…
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            They must be online and accept on their device. You will see their live capture
            once for 10 seconds.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="p-2 rounded-lg shrink-0 hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
        aria-label="Cancel request"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
