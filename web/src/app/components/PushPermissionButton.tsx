"use client";

import { useEffect, useEffectEvent, useState } from "react";

type Status =
  | "idle"
  | "loading"
  | "enabled"
  | "disabled"
  | "unsupported"
  | "missing-key"
  | "denied"
  | "error";

export function PushPermissionButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const refresh = useEffectEvent(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    const key = await loadPublicKey();
    if (!key) {
      setStatus("missing-key");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    setStatus(subscription ? "enabled" : "disabled");
  });

  useEffect(() => {
    void refresh();
  }, []);

  async function enable() {
    setStatus("loading");
    setMessage("");

    try {
      const publicKey = await loadPublicKey();
      if (!publicKey) {
        setStatus("missing-key");
        return;
      }

      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
            auth: arrayBufferToBase64(subscription.getKey("auth")),
          },
          userAgent: navigator.userAgent,
        }),
      });

      setStatus("enabled");
      setMessage("Push notifications enabled on this device.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not enable push notifications.");
    }
  }

  async function disable() {
    setStatus("loading");
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setStatus("disabled");
        return;
      }

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      await subscription.unsubscribe();
      setStatus("disabled");
      setMessage("Push notifications disabled on this device.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not disable push notifications.");
    }
  }

  if (status === "unsupported") {
    return <p className="recorded-row-placeholder">This browser does not support push notifications.</p>;
  }

  if (status === "missing-key") {
    return <p className="recorded-row-placeholder">Push notifications are not configured for this deployment yet.</p>;
  }

  if (status === "denied") {
    return <p className="recorded-row-placeholder">Notifications are blocked in this browser. Enable them in browser settings first.</p>;
  }

  return (
    <div className="help-pwa-stack">
      {status === "enabled" ? (
        <button type="button" onClick={disable} className="action-btn subtle quiet">
          Disable push on this device
        </button>
      ) : (
        <button type="button" onClick={enable} disabled={status === "loading"} className="action-btn bright">
          {status === "loading" ? "Checking…" : "Enable push on this device"}
        </button>
      )}
      {message ? <p className="recorded-row-placeholder">{message}</p> : null}
    </div>
  );
}

async function loadPublicKey() {
  const response = await fetch("/api/push/public-key", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return typeof data?.key === "string" && data.key.length > 0 ? data.key : null;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) {
    return "";
  }

  const bytes = new Uint8Array(buffer);
  let value = "";

  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }

  return window.btoa(value);
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}
