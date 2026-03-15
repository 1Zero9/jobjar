import { APP_VERSION } from "@/lib/app-version";
import type { ReactNode } from "react";
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
