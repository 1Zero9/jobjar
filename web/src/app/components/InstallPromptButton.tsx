"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPromptButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [ios] = useState(() => isIosInstallableBrowser());
  const [status, setStatus] = useState<"idle" | "done" | "pending">("idle");

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setPromptEvent(null);
      setStatus("done");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      return;
    }

    setStatus("pending");
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    setStatus(choice.outcome === "accepted" ? "done" : "idle");
  }

  if (installed) {
    return <p className="recorded-row-placeholder">Installed on this device.</p>;
  }

  if (ios) {
    return (
      <div className="help-pwa-hint">
        <p className="recorded-row-placeholder">On iPhone or iPad, open Share and choose Add to Home Screen.</p>
      </div>
    );
  }

  if (promptEvent) {
    return (
      <button type="button" onClick={install} disabled={status === "pending"} className="action-btn bright">
        {status === "pending" ? "Installing…" : "Install JobJar"}
      </button>
    );
  }

  return (
    <p className="recorded-row-placeholder">
      If your browser supports installation, use its install option from the address bar or browser menu.
    </p>
  );
}

function isStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
}

function isIosInstallableBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);
  return isIos && isSafari && !isStandalone();
}
