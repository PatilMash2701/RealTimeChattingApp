"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, ShieldCheck, Camera, Loader2, Video } from "lucide-react";
import { User, useAppData } from "@/context/AppContext";
import { getProfilePicUrl } from "@/lib/userProfile";
import { SocketData } from "@/context/SocketContext";
import {
  loadFaceModels,
  resetFaceModelsCache,
  verifyFaceAgainstProfile,
} from "@/lib/faceVerification";
import {
  captureFrameFromVideo,
  waitForVideoReady,
  VerificationRequestPayload,
} from "@/lib/identitySnapshot";
import toast from "react-hot-toast";

type Step = "prompt" | "camera" | "scanning";

function getCameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera blocked. Allow camera in the browser address bar, then try again.";
  }
  if (name === "NotFoundError") return "No camera found on this device.";
  if (name === "NotReadableError") return "Camera is in use by another application.";
  return "Could not access the camera.";
}

/** Let React mount the <video> after step changes before we attach the stream */
function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

interface Props {
  request: VerificationRequestPayload;
  loggedInUser: User;
  onClose: () => void;
  onDecline: () => void;
}

/** Shown on the chat partner's device — they verify their own face vs their profile photo */
export default function IdentityVerificationResponderModal({
  request,
  loggedInUser,
  onClose,
  onDecline,
}: Props) {
  const { socket } = SocketData();
  const { users, refreshUser } = useAppData();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [resolvedUser, setResolvedUser] = useState(loggedInUser);
  const [profileLoading, setProfileLoading] = useState(false);

  const [step, setStep] = useState<Step>("prompt");
  const [modelsReady, setModelsReady] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const profileUrl = getProfilePicUrl(resolvedUser);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (getProfilePicUrl(loggedInUser)) {
        setResolvedUser(loggedInUser);
        return;
      }

      setProfileLoading(true);
      const refreshed = await refreshUser();
      if (cancelled) return;

      if (getProfilePicUrl(refreshed)) {
        setResolvedUser(refreshed!);
        setProfileLoading(false);
        return;
      }

      const fromList = users?.find((u) => u._id === loggedInUser._id);
      if (fromList && getProfilePicUrl(fromList)) {
        setResolvedUser(fromList);
      }
      setProfileLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loggedInUser, users, refreshUser]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async (): Promise<boolean> => {
    setCameraError(null);
    setVerifyError(null);
    setCameraLoading(true);
    setCameraReady(false);

    // Video element only exists when step is "camera" — mount it first
    setStep("camera");
    await waitForNextPaint();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video preview not available");
      }

      video.srcObject = stream;
      await video.play();
      await waitForVideoReady(video);
      setCameraReady(true);
      return true;
    } catch (err) {
      stopCamera();
      const msg =
        err instanceof Error && err.message === "Camera took too long to start"
          ? "Camera preview is slow to load. Close other apps using the camera and try again."
          : getCameraErrorMessage(err);
      setCameraError(msg);
      return false;
    } finally {
      setCameraLoading(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch((err) => {
        setModelsError(
          err instanceof Error ? err.message : "Failed to load face models"
        );
      });
    return () => stopCamera();
  }, [stopCamera]);

  const runVerification = async () => {
    if (!profileUrl) return;

    setCameraError(null);
    setVerifyError(null);

    if (!cameraReady || !videoRef.current) {
      const ok = await startCamera();
      if (!ok) return;
    }

    const video = videoRef.current;
    if (!video) return;

    try {
      await waitForVideoReady(video, 5000);
    } catch {
      setCameraError("Camera preview not ready yet. Wait until you see yourself, then tap Scan.");
      return;
    }

    setStep("scanning");

    const liveSnapshot = captureFrameFromVideo(video);
    const result = await verifyFaceAgainstProfile(video, profileUrl);

    stopCamera();

    if (!result.success) {
      setStep("camera");
      setVerifyError(result.error);
      await startCamera();
      return;
    }

    if (liveSnapshot && socket) {
      socket.emit("identity:shareSnapshot", {
        toUserId: request.fromUserId,
        chatId: request.chatId,
        snapshot: liveSnapshot,
        matched: result.matched,
        confidence: result.confidencePercent,
        verifiedByName: loggedInUser.name,
      });
      toast.success(`Live verification sent to ${request.fromUserName}`);
      onClose();
    }
  };

  if (!profileUrl) {
    return (
      <ModalShell onClose={onClose} title="Verification required">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {profileLoading
            ? "Loading your profile photo…"
            : "We could not load your profile photo on this device. Open Profile, confirm your photo is saved, refresh the page, then try again."}
        </p>
        <button type="button" className="btn-primary mt-4" onClick={onClose} disabled={profileLoading}>
          OK
        </button>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      onClose={() => {
        stopCamera();
        onDecline();
      }}
      title="Verify your identity"
    >
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {request.fromUserName}
        </span>{" "}
        wants to confirm you are the real account owner. Use your camera now — your live
        face will be compared to <strong>your profile photo</strong> and shown to them once
        for 10 seconds (not saved).
      </p>

      {modelsError && (
        <AlertBox>
          {modelsError}
          <button
            type="button"
            className="underline text-xs mt-1"
            onClick={() => {
              resetFaceModelsCache();
              loadFaceModels().then(() => setModelsReady(true));
            }}
          >
            Retry models
          </button>
        </AlertBox>
      )}

      {step === "prompt" && (
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={startCamera}
            disabled={!modelsReady || cameraLoading}
          >
            {cameraLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            Accept & verify
          </button>
          <button
            type="button"
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
            onClick={onDecline}
          >
            Decline
          </button>
        </div>
      )}

      {step !== "prompt" && (
        <>
          {cameraError && <AlertBox>{cameraError}</AlertBox>}
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror-video"
            />
            {(cameraLoading || step === "scanning") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-2">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--accent)" }} />
                <span className="text-white text-sm">
                  {step === "scanning" ? "Verifying your face…" : "Starting camera…"}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={runVerification}
            disabled={!modelsReady || cameraLoading || step === "scanning" || !cameraReady}
          >
            <Camera className="w-4 h-4" />
            {cameraReady
              ? `Scan & send to ${request.fromUserName}`
              : "Waiting for camera…"}
          </button>
          {!cameraReady && !cameraLoading && (
            <button type="button" className="text-xs underline w-full" onClick={startCamera}>
              Retry camera
            </button>
          )}
        </>
      )}

      {verifyError && <AlertBox>{verifyError}</AlertBox>}
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center p-4 backdrop-blur-md"
      style={{ background: "rgba(9, 8, 15, 0.8)" }}
    >
      <div className="w-full max-w-md rounded-2xl glass-card p-5 space-y-4 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AlertBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-3 text-sm"
      style={{
        background: "rgba(244, 63, 94, 0.1)",
        color: "var(--danger)",
        border: "1px solid rgba(244, 63, 94, 0.25)",
      }}
    >
      {children}
    </div>
  );
}
