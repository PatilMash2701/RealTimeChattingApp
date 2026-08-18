/**
 * Identity verification via face-api.js embeddings (client-side only).
 *
 * Privacy: live camera frames are processed in-memory only — never uploaded
 * or stored on the server. Only the account profile photo URL is fetched for
 * comparison against the person in front of the camera.
 */

/** Euclidean distance below this = same person (face-api.js default ~0.6) */
export const VERIFY_MATCH_THRESHOLD = 0.55;

/** Distance at or above this = clear non-match */
export const VERIFY_FAIL_THRESHOLD = 0.75;

export type VerificationResult =
  | {
      success: true;
      matched: boolean;
      distance: number;
      confidencePercent: number;
    }
  | {
      success: false;
      error: string;
    };

let modelsLoadPromise: Promise<void> | null = null;

function getModelBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/models`;
  }
  return "/models";
}

/** Reset cached load state so user can retry after fixing missing model files */
export function resetFaceModelsCache(): void {
  modelsLoadPromise = null;
}

export async function loadFaceModels(): Promise<void> {
  if (modelsLoadPromise) return modelsLoadPromise;

  modelsLoadPromise = (async () => {
    const faceapi = await import("face-api.js");
    const MODEL_URL = getModelBaseUrl();

    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    } catch (err) {
      modelsLoadPromise = null;
      const hint =
        err instanceof Error && err.message.includes("404")
          ? " Missing model files — run: cd frontend && npm run face-models"
          : "";
      throw new Error(
        (err instanceof Error ? err.message : "Model load failed") + hint
      );
    }
  })();

  return modelsLoadPromise;
}

async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const tryLoad = (src: string, crossOrigin?: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("load failed"));
      img.src = src;
    });

  try {
    return await tryLoad(url, "anonymous");
  } catch {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load profile image");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await tryLoad(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function distanceToConfidence(distance: number): number {
  if (distance <= VERIFY_MATCH_THRESHOLD) {
    const ratio = 1 - distance / VERIFY_MATCH_THRESHOLD;
    return Math.round(70 + ratio * 30);
  }
  if (distance >= VERIFY_FAIL_THRESHOLD) {
    return Math.round(Math.max(0, 30 - (distance - VERIFY_FAIL_THRESHOLD) * 100));
  }
  const mid = (distance - VERIFY_MATCH_THRESHOLD) / (VERIFY_FAIL_THRESHOLD - VERIFY_MATCH_THRESHOLD);
  return Math.round(50 * (1 - mid));
}

export async function getDescriptorFromImage(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array> {
  const faceapi = await import("face-api.js");
  const detection = await faceapi
    .detectSingleFace(source, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    throw new Error("No face detected. Center your face in the frame.");
  }

  return detection.descriptor;
}

export async function getDescriptorFromVideoFrame(
  video: HTMLVideoElement
): Promise<Float32Array> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not capture frame");
  ctx.drawImage(video, 0, 0);
  return getDescriptorFromImage(canvas);
}

export async function verifyFaceAgainstProfile(
  liveVideo: HTMLVideoElement,
  profileImageUrl: string
): Promise<VerificationResult> {
  try {
    await loadFaceModels();
    const faceapi = await import("face-api.js");

    const [liveDescriptor, profileImg] = await Promise.all([
      getDescriptorFromVideoFrame(liveVideo),
      loadImageFromUrl(profileImageUrl),
    ]);

    const profileDescriptor = await getDescriptorFromImage(profileImg);
    const distance = faceapi.euclideanDistance(liveDescriptor, profileDescriptor);
    const matched = distance < VERIFY_MATCH_THRESHOLD;
    const confidencePercent = distanceToConfidence(distance);

    return {
      success: true,
      matched,
      distance,
      confidencePercent,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return { success: false, error: message };
  }
}
