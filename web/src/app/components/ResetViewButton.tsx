"use client";

import { usePathname, useSearchParams } from "next/navigation";

export function ResetViewButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <button
      type="button"
      className="action-btn subtle quiet theme-toggle compact"
      aria-label="Reset view"
      title="Reset view"
      onClick={() => {
        const cleanPath = pathname || "/";
        const hasSearch = searchParams.toString().length > 0;
        const hasHash = typeof window !== "undefined" && window.location.hash.length > 0;

        if (typeof window === "undefined") {
          return;
        }

        if (hasSearch || hasHash) {
          window.location.assign(cleanPath);
          return;
        }

        window.location.reload();
      }}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 3v5h5" />
        </svg>
      </span>
      <span className="theme-toggle-sr">Reset view</span>
    </button>
  );
}
