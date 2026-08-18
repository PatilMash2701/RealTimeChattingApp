import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { Zap } from "lucide-react";

interface PulseLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: "w-9 h-9", iconInner: "w-4 h-4", title: "text-lg", tagline: "text-xs" },
  md: { icon: "w-12 h-12", iconInner: "w-6 h-6", title: "text-2xl", tagline: "text-sm" },
  lg: { icon: "w-16 h-16", iconInner: "w-8 h-8", title: "text-3xl", tagline: "text-base" },
};

export default function PulseLogo({
  size = "md",
  showTagline = false,
  className = "",
}: PulseLogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        className={`${s.icon} rounded-2xl flex items-center justify-center shadow-lg`}
        style={{
          background: "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
          boxShadow: "0 8px 32px var(--accent-glow)",
        }}
      >
        <Zap className={`${s.iconInner} text-white fill-white/20`} strokeWidth={2.5} />
      </div>
      <div className="text-center">
        <h1 className={`${s.title} font-bold tracking-tight gradient-text`}>{APP_NAME}</h1>
        {showTagline && (
          <p className={`${s.tagline} mt-1`} style={{ color: "var(--text-secondary)" }}>
            {APP_TAGLINE}
          </p>
        )}
      </div>
    </div>
  );
}
