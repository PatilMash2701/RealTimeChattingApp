"use client";

import React, { useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  UserCircle,
} from "lucide-react";
import { useCall } from "@/context/CallContext";

export default function CallOverlay() {
  const {
    callStatus,
    callType,
    remotePeer,
    isMuted,
    isCameraOff,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callStatus === "idle" || !remotePeer) return null;

  const isVideo = callType === "video";
  const showVideoUI = isVideo && callStatus === "active";

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: "linear-gradient(180deg, #0f0d18 0%, #1a1528 50%, #0f0d18 100%)" }}
    >
      {/* Remote video / avatar */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {showVideoUI && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-6 z-10">
            <div
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden flex items-center justify-center shadow-2xl"
              style={{
                background: "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
                boxShadow: "0 20px 60px var(--accent-glow)",
              }}
            >
              {remotePeer.profilePic?.url ? (
                <img
                  src={remotePeer.profilePic.url}
                  alt={remotePeer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle className="w-20 h-20 text-white/80" />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{remotePeer.name}</h2>
              <p className="text-white/60 mt-2 text-sm sm:text-base">
                {callStatus === "incoming" && "Incoming call…"}
                {callStatus === "outgoing" && "Calling…"}
                {callStatus === "active" && (isVideo ? "Video call" : "Voice call")}
              </p>
              {callStatus === "incoming" && (
                <p className="text-white/40 text-xs mt-1">
                  {isVideo ? "Video" : "Audio"} call
                </p>
              )}
            </div>
            {callStatus === "outgoing" && (
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/80 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local PiP */}
        {showVideoUI && localStream && !isCameraOff && (
          <div
            className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden shadow-2xl z-20 border-2"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror-video"
            />
          </div>
        )}
        {showVideoUI && isCameraOff && (
          <div
            className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl flex items-center justify-center z-20 border-2"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            <VideoOff className="w-8 h-8 text-white/50" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 px-6 pb-10 pt-6 safe-area-pb">
        {callStatus === "incoming" ? (
          <div className="flex items-center justify-center gap-10 sm:gap-16">
            <button
              type="button"
              onClick={rejectCall}
              className="flex flex-col items-center gap-2 group"
              aria-label="Decline"
            >
              <span
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95"
                style={{ background: "#ef4444" }}
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </span>
              <span className="text-xs text-white/70">Decline</span>
            </button>
            <button
              type="button"
              onClick={acceptCall}
              className="flex flex-col items-center gap-2 group"
              aria-label="Accept"
            >
              <span
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95 animate-pulse"
                style={{ background: "#22c55e" }}
              >
                {isVideo ? (
                  <Video className="w-7 h-7 text-white" />
                ) : (
                  <Phone className="w-7 h-7 text-white" />
                )}
              </span>
              <span className="text-xs text-white/70">Accept</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {callStatus === "active" && (
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <ControlButton
                  onClick={toggleMute}
                  active={isMuted}
                  label={isMuted ? "Unmute" : "Mute"}
                  icon={isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                />
                {isVideo && (
                  <ControlButton
                    onClick={toggleCamera}
                    active={isCameraOff}
                    label={isCameraOff ? "Camera on" : "Camera off"}
                    icon={
                      isCameraOff ? (
                        <VideoOff className="w-6 h-6" />
                      ) : (
                        <Video className="w-6 h-6" />
                      )
                    }
                  />
                )}
              </div>
            )}
            <button
              type="button"
              onClick={endCall}
              className="flex flex-col items-center gap-2 group"
              aria-label="End call"
            >
              <span
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95"
                style={{ background: "#ef4444" }}
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </span>
              <span className="text-xs text-white/70">
                {callStatus === "outgoing" ? "Cancel" : "End"}
              </span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

function ControlButton({
  onClick,
  active,
  label,
  icon,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
      aria-label={label}
    >
      <span
        className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all group-hover:scale-105"
        style={{
          background: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)",
          color: active ? "#111" : "#fff",
        }}
      >
        {icon}
      </span>
      <span className="text-[10px] text-white/60">{label}</span>
    </button>
  );
}
