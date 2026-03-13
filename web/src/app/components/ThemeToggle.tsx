"use client";

import { useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "jobjar-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

function readTheme(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={`action-btn subtle quiet theme-toggle${compact ? " compact" : ""}`}
      suppressHydrationWarning
      aria-pressed={theme === "dark"}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      onClick={() => {
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === "dark" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2.2" />
            <path d="M12 19.8V22" />
            <path d="m4.93 4.93 1.56 1.56" />
            <path d="m17.51 17.51 1.56 1.56" />
            <path d="M2 12h2.2" />
            <path d="M19.8 12H22" />
            <path d="m4.93 19.07 1.56-1.56" />
            <path d="m17.51 6.49 1.56-1.56" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a7 7 0 1 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
      </span>
      {compact ? <span className="theme-toggle-sr">{theme === "dark" ? "Light mode" : "Dark mode"}</span> : <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
