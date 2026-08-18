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
import toast from "react-hot-toast";
import { useAppData, User } from "./AppContext";
import { getProfilePicUrl } from "@/lib/userProfile";
import { SocketData } from "./SocketContext";
import IdentityVerificationResponderModal from "@/components/IdentityVerificationResponderModal";
import type {
  PendingVerificationRequest,
  VerificationRequestPayload,
  VerificationSnapshotPayload,
} from "@/lib/identitySnapshot";

interface IdentityVerificationContextType {
  requestPeerVerification: (peer: User, chatId: string) => void;
  cancelPendingRequest: () => void;
  pendingRequest: PendingVerificationRequest | null;
  getSnapshotForChat: (chatId: string) => VerificationSnapshotPayload | null;
  dismissSnapshotView: (chatId: string, at: number) => void;
}

const IdentityVerificationContext =
  createContext<IdentityVerificationContextType | null>(null);

export function IdentityVerificationProvider({ children }: { children: ReactNode }) {
  const { user: loggedInUser, users, refreshUser, setUser } = useAppData();
  const { socket, onlineUsers } = SocketData();

  const [incomingRequest, setIncomingRequest] =
    useState<VerificationRequestPayload | null>(null);
  const [pendingRequest, setPendingRequest] =
    useState<PendingVerificationRequest | null>(null);
  const [snapshotByChat, setSnapshotByChat] = useState<
    Record<string, VerificationSnapshotPayload>
  >({});
  const viewedKeysRef = useRef<Set<string>>(new Set());

  const dismissSnapshotView = useCallback((chatId: string, at: number) => {
    viewedKeysRef.current.add(`${chatId}-${at}`);
    setSnapshotByChat((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
  }, []);

  const getSnapshotForChat = useCallback(
    (chatId: string) => {
      const snap = snapshotByChat[chatId];
      if (!snap) return null;
      if (viewedKeysRef.current.has(`${chatId}-${snap.at}`)) return null;
      return snap;
    },
    [snapshotByChat]
  );

  const cancelPendingRequest = useCallback(() => {
    if (!socket || !pendingRequest || !loggedInUser) {
      setPendingRequest(null);
      return;
    }
    socket.emit("identity:cancelVerification", {
      toUserId: pendingRequest.targetUserId,
      chatId: pendingRequest.chatId,
      requesterId: loggedInUser._id,
    });
    setPendingRequest(null);
    toast("Verification request cancelled");
  }, [socket, pendingRequest, loggedInUser]);

  const requestPeerVerification = useCallback(
    (peer: User, chatId: string) => {
      if (!socket || !loggedInUser) return;

      if (!onlineUsers.includes(peer._id)) {
        toast.error(
          `${peer.name} is offline. They must be online on Pulse to verify themselves.`
        );
        return;
      }

      if (!getProfilePicUrl(peer)) {
        toast.error(`${peer.name} has no profile photo. They need one before verification.`);
        return;
      }

      socket.emit("identity:requestVerification", {
        toUserId: peer._id,
        chatId,
        requesterId: loggedInUser._id,
        requesterName: loggedInUser.name,
      });

      setPendingRequest({
        targetUserId: peer._id,
        targetUserName: peer.name,
        chatId,
        at: Date.now(),
      });

      toast.success(`Verification request sent to ${peer.name}`);
    },
    [socket, loggedInUser, onlineUsers]
  );

  const declineIncoming = useCallback(() => {
    if (!socket || !incomingRequest || !loggedInUser) {
      setIncomingRequest(null);
      return;
    }
    socket.emit("identity:declineVerification", {
      toUserId: incomingRequest.fromUserId,
      chatId: incomingRequest.chatId,
      targetUserId: loggedInUser._id,
      targetUserName: loggedInUser.name,
    });
    setIncomingRequest(null);
  }, [socket, incomingRequest, loggedInUser]);

  useEffect(() => {
    if (!socket) return;

    const onRequest = async (payload: VerificationRequestPayload) => {
      if (!payload?.fromUserId || !payload?.chatId) return;

      let self = loggedInUser;
      if (!getProfilePicUrl(self)) {
        const refreshed = await refreshUser();
        if (refreshed) self = refreshed;
      }
      if (!getProfilePicUrl(self) && users?.length && self?._id) {
        const fromList = users.find((u) => u._id === self!._id);
        if (fromList && getProfilePicUrl(fromList)) {
          setUser(fromList);
          self = fromList;
        }
      }

      setIncomingRequest(payload);
      toast(`Identity verification requested by ${payload.fromUserName}`, {
        duration: 5000,
      });
    };

    const onSnapshot = (payload: VerificationSnapshotPayload) => {
      if (!payload?.chatId || !payload?.snapshot) return;
      const key = `${payload.chatId}-${payload.at}`;
      if (viewedKeysRef.current.has(key)) return;

      setSnapshotByChat((prev) => {
        const existing = prev[payload.chatId];
        if (existing && viewedKeysRef.current.has(`${payload.chatId}-${existing.at}`)) {
          return prev;
        }
        return { ...prev, [payload.chatId]: payload };
      });
      setPendingRequest((p) => (p?.chatId === payload.chatId ? null : p));

      toast.success(
        payload.matched
          ? `${payload.verifiedByName} verified — face matched profile`
          : `${payload.verifiedByName} verified — face did NOT match`,
        { duration: 5000 }
      );
    };

    const onUnavailable = (data: { chatId?: string; reason?: string }) => {
      setPendingRequest((p) =>
        p && (!data.chatId || p.chatId === data.chatId) ? null : p
      );
      toast.error(
        data.reason === "offline"
          ? "User went offline. Verification requires them to be online."
          : "User is not available for verification."
      );
    };

    const onDeclined = (data: { chatId?: string; targetUserName?: string }) => {
      setPendingRequest((p) =>
        p && (!data.chatId || p.chatId === data.chatId) ? null : p
      );
      toast.error(
        `${data.targetUserName || "User"} declined the verification request`
      );
    };

    const onCancelled = (data: { chatId?: string; fromUserName?: string }) => {
      setIncomingRequest((r) =>
        r && (!data.chatId || r.chatId === data.chatId) ? null : r
      );
      if (data.fromUserName) {
        toast(`${data.fromUserName} cancelled verification`);
      }
    };

    socket.on("identity:verificationRequest", onRequest);
    socket.on("identity:verificationSnapshot", onSnapshot);
    socket.on("identity:verificationUnavailable", onUnavailable);
    socket.on("identity:verificationDeclined", onDeclined);
    socket.on("identity:verificationCancelled", onCancelled);

    return () => {
      socket.off("identity:verificationRequest", onRequest);
      socket.off("identity:verificationSnapshot", onSnapshot);
      socket.off("identity:verificationUnavailable", onUnavailable);
      socket.off("identity:verificationDeclined", onDeclined);
      socket.off("identity:verificationCancelled", onCancelled);
    };
  }, [socket, loggedInUser, users, refreshUser, setUser]);

  return (
    <IdentityVerificationContext.Provider
      value={{
        requestPeerVerification,
        cancelPendingRequest,
        pendingRequest,
        getSnapshotForChat,
        dismissSnapshotView,
      }}
    >
      {children}
      {incomingRequest && loggedInUser && (
        <IdentityVerificationResponderModal
          request={incomingRequest}
          loggedInUser={loggedInUser}
          onClose={() => setIncomingRequest(null)}
          onDecline={declineIncoming}
        />
      )}
    </IdentityVerificationContext.Provider>
  );
}

export function useIdentityVerification() {
  const ctx = useContext(IdentityVerificationContext);
  if (!ctx) {
    throw new Error(
      "useIdentityVerification must be used within IdentityVerificationProvider"
    );
  }
  return ctx;
}
