/** Live verification snapshot shared over socket (ephemeral, not stored in DB). */

export const SNAPSHOT_DISPLAY_SECONDS = 10;

export interface VerificationRequestPayload {
  fromUserId: string;
  fromUserName: string;
  chatId: string;
  at: number;
}

export interface PendingVerificationRequest {
  targetUserId: string;
  targetUserName: string;
  chatId: string;
  at: number;
}

export interface VerificationSnapshotPayload {
  chatId: string;
  snapshot: string;
  matched: boolean;
  confidence: number;
  verifiedByName: string;
  at: number;
}

/**
 * Capture one live frame from the camera for anti-spoofing proof.
 * Privacy: JPEG stays in memory / socket only — never written to disk or DB.
 */
/** Wait until the camera video has frames (metadata + dimensions). */
export function waitForVideoReady(
  video: HTMLVideoElement,
  timeoutMs = 10000
): Promise<void> {
  const isReady = () =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0;

  if (isReady()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera took too long to start"));
    }, timeoutMs);

    const onReady = () => {
      if (!isReady()) return;
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("playing", onReady);
    };

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("playing", onReady);
  });
}

export function captureFrameFromVideo(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const maxW = 480;
  const w = Math.min(video.videoWidth, maxW);
  const h = Math.round((video.videoHeight / video.videoWidth) * w);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.65);
}
