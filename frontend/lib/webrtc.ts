export type CallType = "audio" | "video";

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function getMediaConstraints(type: CallType): MediaStreamConstraints {
  return {
    audio: { echoCancellation: true, noiseSuppression: true },
    video: type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  };
}

export async function checkMediaDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    
    console.log(`Audio devices: ${audioDevices.length}`, audioDevices);
    console.log(`Video devices: ${videoDevices.length}`, videoDevices);
    
    return { audioDevices, videoDevices, hasAudio: audioDevices.length > 0, hasVideo: videoDevices.length > 0 };
  } catch (err) {
    console.error('Error checking media devices:', err);
    return { audioDevices: [], videoDevices: [], hasAudio: false, hasVideo: false };
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
