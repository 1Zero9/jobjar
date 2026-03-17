"use client";

import { logoutAction } from "@/app/actions";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useEffectEvent, useRef } from "react";

const REFRESH_AFTER_MS = 30 * 60 * 1000;
const IDLE_LOGOUT_AFTER_MS = 4 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "jobjar-last-activity-at";
const LAST_REFRESH_KEY = "jobjar-last-refresh-at";

export function SessionWatchdog() {
  const formRef = useRef<HTMLFormElement>(null);
  const nextInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const disabled = isLoginPage || pathname === "/offline";

  const noteActivity = useEffectEvent(() => {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  });

  const resetSessionTimers = useEffectEvent((now: number) => {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    window.localStorage.setItem(LAST_REFRESH_KEY, String(now));
  });

  const refreshIfStale = useEffectEvent((now: number) => {
    const lastRefresh = readTimestamp(LAST_REFRESH_KEY);

    if (!navigator.onLine) {
      return;
    }

    if (lastRefresh && now - lastRefresh < REFRESH_AFTER_MS) {
      return;
    }

    window.localStorage.setItem(LAST_REFRESH_KEY, String(now));
    startTransition(() => {
      router.refresh();
    });
  });

  const checkSessionState = useEffectEvent((reason: "mount" | "resume" | "interval") => {
    if (disabled) {
      return;
    }

    const now = Date.now();
    const lastActivity = readTimestamp(LAST_ACTIVITY_KEY);

    if (lastActivity && now - lastActivity >= IDLE_LOGOUT_AFTER_MS) {
      resetSessionTimers(now);
      if (nextInputRef.current) {
        nextInputRef.current.value = getCurrentPath();
      }
      formRef.current?.requestSubmit();
      return;
    }

    if (reason !== "interval" || document.visibilityState === "visible") {
      refreshIfStale(now);
    }

    if (reason !== "interval") {
      noteActivity();
    }
  });

  useEffect(() => {
    if (disabled) {
      if (isLoginPage) {
        resetSessionTimers(Date.now());
      }
      return;
    }

    checkSessionState("mount");

    function handleActivity() {
      noteActivity();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkSessionState("resume");
      }
    }

    function handleFocus() {
      checkSessionState("resume");
    }

    function handleOnline() {
      refreshIfStale(Date.now());
    }

    const intervalId = window.setInterval(() => {
      checkSessionState("interval");
    }, 60 * 1000);

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [disabled, isLoginPage]);

  if (disabled) {
    return null;
  }

  return (
    <form ref={formRef} action={logoutAction} hidden aria-hidden="true">
      <input ref={nextInputRef} type="hidden" name="next" defaultValue={pathname} />
      <input type="hidden" name="reason" value="expired" />
    </form>
  );
}

function readTimestamp(key: string) {
  const raw = window.localStorage.getItem(key);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getCurrentPath() {
  return `${window.location.pathname}${window.location.search}`;
}
