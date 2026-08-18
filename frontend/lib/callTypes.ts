import type { CallType } from "./webrtc";

export type CallStatus = "idle" | "outgoing" | "incoming" | "active" | "ended";

export interface CallPeer {
  _id: string;
  name: string;
  profilePic?: { url: string };
}

export interface IncomingCallPayload {
  fromUserId: string;
  offer: RTCSessionDescriptionInit;
  callType: CallType;
  caller: CallPeer;
}
