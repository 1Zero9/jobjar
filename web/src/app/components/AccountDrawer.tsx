"use client";

import { APP_VERSION } from "@/lib/app-version";
import { HelpIcon, PeopleIcon, SettingsIcon } from "@/lib/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutIconButton } from "./LogoutIconButton";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  displayName: string;
  isAdmin: boolean;
  canManagePeople: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "?";
}

export function AccountDrawer({ displayName, isAdmin, canManagePeople }: Props) {
  const [open, setOpen] = useState(false);
  const abbr = initials(displayName);

  // Close on back navigation
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [open]);

  return (
    <>
      {/* Nav trigger */}
      <button
        type="button"
        className="app-bottom-nav-link"
        onClick={() => setOpen(true)}
        aria-label="Account"
        aria-expanded={open}
      >
        <span className="app-bottom-nav-icon">
          <span className="acct-avatar-sm" aria-hidden="true">{abbr}</span>
        </span>
        <span className="app-bottom-nav-label">Account</span>
      </button>

      {/* Backdrop */}
      <div
        className={`acct-backdrop${open ? " acct-backdrop-open" : ""}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`acct-drawer glass-surface${open ? " acct-drawer-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Account"
      >
        <div className="acct-drawer-handle" aria-hidden="true" />

        {/* Profile header */}
        <div className="acct-profile">
          <div className="acct-avatar" aria-hidden="true">{abbr}</div>
          <div className="acct-profile-info">
            <span className="acct-name">{displayName || "You"}</span>
            <span className="version-chip">{APP_VERSION}</span>
          </div>
        </div>

        {/* Actions row */}
        <div className="acct-actions">
          <div className="acct-action-card">
            <span className="acct-action-label">Theme</span>
            <ThemeToggle compact />
          </div>
          <div className="acct-action-card">
            <span className="acct-action-label">Sign out</span>
            <LogoutIconButton />
          </div>
        </div>

        {/* Links */}
        <div className="acct-links">
          <Link href="/help" className="acct-link" onClick={() => setOpen(false)}>
            <HelpIcon width="18" height="18" />
            <span>Help</span>
          </Link>
          {isAdmin ? (
            <Link href="/settings" className="acct-link" onClick={() => setOpen(false)}>
              <SettingsIcon width="18" height="18" />
              <span>Settings</span>
            </Link>
          ) : canManagePeople ? (
            <Link href="/settings/people" className="acct-link" onClick={() => setOpen(false)}>
              <PeopleIcon width="18" height="18" />
              <span>People</span>
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
