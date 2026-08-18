"use client";

import { useEffect } from "react";
import axios from "axios";
import { user_service } from "@/context/AppContext";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotifications() {
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return;
      if (!("serviceWorker" in navigator)) return;
      if (!("PushManager" in window)) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const reg = await navigator.serviceWorker.register("/sw.js");

        const existing = await reg.pushManager.getSubscription();
        if (existing) return;

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        if (cancelled) return;

        await axios.post(
          `${user_service}/api/v1/user/push/subscribe`,
          { subscription },
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        // Keep it non-fatal for local development.
        console.log("Push setup failed:", err);
      }
    };

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

