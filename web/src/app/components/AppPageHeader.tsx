import { APP_VERSION } from "@/lib/app-version";
import type { ReactNode } from "react";
import { HeaderIconLink } from "./HeaderIconLink";
import { ResetViewButton } from "./ResetViewButton";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  iconClassName?: string;
  actions?: ReactNode;
  cornerAction?: ReactNode;
  className?: string;
  scopeLabel?: string | null;
  showHelpTool?: boolean;
};

export function AppPageHeader({
  title,
  subtitle,
  icon,
  iconClassName = "",
  actions,
  cornerAction,
  className = "",
  scopeLabel = null,
  showHelpTool = true,
}: Props) {
  return (
    <header className={`page-hero-card ${className}`.trim()}>
      <div className="page-hero-topline">
        <div className="page-hero-topline-main">
          {icon ? <div className={`page-hero-icon ${iconClassName}`.trim()}>{icon}</div> : null}
          <div className="page-hero-brand-row">
            <p className="page-hero-brand">Jobjar</p>
            <span className="version-chip">{APP_VERSION}</span>
          </div>
        </div>
        <div className="hero-corner-stack">
          <div className="hero-corner-tools">
            <ResetViewButton />
            <ThemeToggle compact />
            {showHelpTool ? (
              <HeaderIconLink href="/help" label="Help">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
                  <path d="M12 17h.01" />
                </svg>
              </HeaderIconLink>
            ) : null}
            {cornerAction}
          </div>
        </div>
      </div>
      <div className="page-hero-copy">
        <h1 className="page-hero-title">{title}</h1>
        <p className="page-hero-subtitle">{subtitle}</p>
      </div>
      <div className="capture-topbar-actions">
        {scopeLabel ? (
          <span className="location-scope-chip" title={`Current location scope: ${scopeLabel}`}>
            <span>Location</span>
            <strong>{scopeLabel}</strong>
          </span>
        ) : null}
        {actions}
      </div>
    </header>
  );
}
