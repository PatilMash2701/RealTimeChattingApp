"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useAppData, User } from "./AppContext";
import { SocketData } from "./SocketContext";
import {
  CallType,
  ICE_SERVERS,
  getMediaConstraints,
  stopMediaStream,
  checkMediaDevices,
} from "@/lib/webrtc";
import type { CallPeer, CallStatus, IncomingCallPayload } from "@/lib/callTypes";

interface CallContextType {
  callStatus: CallStatus;
  callType: CallType | null;
  remotePeer: CallPeer | null;
  isMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (peer: User, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

function toCallPeer(user: User): CallPeer {
  return {
    _id: user._id,
    name: user.name,
    profilePic: user.profilePic,
  };
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user: loggedInUser } = useAppData();
  const { socket } = SocketData();

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [remotePeer, setRemotePeer] = useState<CallPeer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const incomingRef = useRef<IncomingCallPayload | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callStatusRef = useRef<CallStatus>("idle");

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  const emitToPeer = useCallback(
    (event: string, toUserId: string, payload: Record<string, unknown> = {}) => {
      socket?.emit(event, { toUserId, ...payload });
    },
    [socket]
  );

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    const pending = [...pendingIceRef.current];
    pendingIceRef.current = [];
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE candidate error:", err);
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    incomingRef.current = null;
    pendingIceRef.current = [];
    setIsMuted(false);
    setIsCameraOff(false);
    setCallType(null);
    setRemotePeer(null);
    setCallStatus("idle");
  }, []);

  const endCall = useCallback(() => {
    const peerId = remotePeer?._id;
    if (peerId && socket) {
      emitToPeer("call:end", peerId);
    }
    cleanup();
  }, [remotePeer?._id, socket, emitToPeer, cleanup]);

  const createPeerConnection = useCallback(
    (peerId: string, stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const [remote] = event.streams;
        if (remote) setRemoteStream(remote);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emitToPeer("call:ice-candidate", peerId, {
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          if (callStatusRef.current === "active") endCall();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [emitToPeer, endCall]
  );

  const getLocalMedia = useCallback(async (type: CallType) => {
    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(type));
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("addIceCandidate failed:", err);
      }
    },
    []
  );

  const startCall = useCallback(
    async (peer: User, type: CallType) => {
      if (!socket || !loggedInUser?._id) return;
      if (callStatusRef.current !== "idle") return;
      if (!peer._id || peer._id === loggedInUser._id) return;

      try {
        setCallType(type);
        setRemotePeer(toCallPeer(peer));
        setCallStatus("outgoing");

        const stream = await getLocalMedia(type);
        const pc = createPeerConnection(peer._id, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call:offer", {
          toUserId: peer._id,
          offer,
          callType: type,
          caller: toCallPeer(loggedInUser),
        });
      } catch (err) {
        const error = err as Error;
        console.error("startCall failed:", error.name, error.message);
        
        // Check available devices for debugging
        const devices = await checkMediaDevices();
        console.log("Available devices:", devices);
        
        let errorMsg = "Could not access microphone/camera. ";
        if (error.name === "NotReadableError") {
          errorMsg += "\n- Camera/microphone already in use by another app\n- Try closing Zoom, Teams, Discord, etc.\n- Or check browser permissions (Settings > Privacy)";
        } else if (error.name === "NotAllowedError") {
          errorMsg += "Please allow microphone/camera permissions in your browser.";
        } else if (error.name === "NotFoundError") {
          errorMsg += `No ${type === "video" ? "camera" : "microphone"} found. Check device connections.`;
        }
        
        cleanup();
        alert(errorMsg);
      }
    },
    [socket, loggedInUser, getLocalMedia, createPeerConnection, cleanup]
  );

  const acceptCall = useCallback(async () => {
    const incoming = incomingRef.current;
    if (!socket || !loggedInUser?._id || !incoming) return;

    try {
      setCallStatus("active");
      setCallType(incoming.callType);
      setRemotePeer(incoming.caller);

      const stream = await getLocalMedia(incoming.callType);
      const pc = createPeerConnection(incoming.fromUserId, stream);
      await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      await flushPendingIce(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:answer", {
        toUserId: incoming.fromUserId,
        answer,
      });
      incomingRef.current = null;
    } catch (err) {
      const error = err as Error;
      console.error("acceptCall failed:", error.name, error.message);
      
      // Check available devices for debugging
      const devices = await checkMediaDevices();
      console.log("Available devices:", devices);
      
      let errorMsg = "Could not access microphone/camera. ";
      if (error.name === "NotReadableError") {
        errorMsg += "\n- Camera/microphone already in use by another app\n- Try closing Zoom, Teams, Discord, etc.\n- Or check browser permissions (Settings > Privacy)";
      } else if (error.name === "NotAllowedError") {
        errorMsg += "Please allow microphone/camera permissions in your browser.";
      } else if (error.name === "NotFoundError") {
        errorMsg += "No camera/microphone found. Check device connections.";
      }
      
      const incoming = incomingRef.current;
      if (incoming && socket) {
        emitToPeer("call:reject", incoming.fromUserId);
      }
      cleanup();
      alert(errorMsg);
    }
  }, [
    socket,
    loggedInUser,
    getLocalMedia,
    createPeerConnection,
    flushPendingIce,
    emitToPeer,
    cleanup,
  ]);

  const rejectCall = useCallback(() => {
    const incoming = incomingRef.current;
    if (incoming && socket) {
      emitToPeer("call:reject", incoming.fromUserId);
    }
    cleanup();
  }, [socket, emitToPeer, cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audio = stream.getAudioTracks()[0];
    if (audio) {
      audio.enabled = !audio.enabled;
      setIsMuted(!audio.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream || callType !== "video") return;
    const video = stream.getVideoTracks()[0];
    if (video) {
      video.enabled = !video.enabled;
      setIsCameraOff(!video.enabled);
    }
  }, [callType]);

  useEffect(() => {
    if (!socket) return;

    const onOffer = async (data: IncomingCallPayload) => {
      if (callStatusRef.current !== "idle") {
        socket.emit("call:busy", { toUserId: data.fromUserId });
        return;
      }
      incomingRef.current = data;
      setRemotePeer(data.caller);
      setCallType(data.callType);
      setCallStatus("incoming");
    };

    const onAnswer = async ({
      fromUserId,
      answer,
    }: {
      fromUserId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await flushPendingIce(pc);
      setCallStatus("active");
    };

    const onIce = ({
      candidate,
    }: {
      fromUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      addIceCandidate(candidate);
    };

    const onReject = () => {
      cleanup();
    };

    const onEnd = () => {
      cleanup();
    };

    const onBusy = () => {
      cleanup();
      alert("User is busy on another call");
    };

    const onUnavailable = () => {
      cleanup();
      alert("User is offline or unavailable");
    };

    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIce);
    socket.on("call:reject", onReject);
    socket.on("call:end", onEnd);
    socket.on("call:busy", onBusy);
    socket.on("call:unavailable", onUnavailable);

    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIce);
      socket.off("call:reject", onReject);
      socket.off("call:end", onEnd);
      socket.off("call:busy", onBusy);
      socket.off("call:unavailable", onUnavailable);
    };
  }, [socket, cleanup, flushPendingIce, addIceCandidate]);

  useEffect(() => {
    return () => {
      if (callStatusRef.current !== "idle") cleanup();
    };
  }, [cleanup]);

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callType,
        remotePeer,
        isMuted,
        isCameraOff,
        localStream,
        remoteStream,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
