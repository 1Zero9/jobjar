import { APP_VERSION } from "@/lib/app-version";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  iconClassName?: string;
  actions?: ReactNode;
};

export function AppPageHeader({ title, subtitle, icon, iconClassName = "", actions }: Props) {
  return (
    <header className="page-hero-card">
      <div className="page-hero-main">
        {icon ? <div className={`page-hero-icon ${iconClassName}`.trim()}>{icon}</div> : null}
        <div className="page-hero-copy">
          <div className="page-hero-brand-row">
            <p className="page-hero-brand">Jobjar</p>
            <span className="version-chip">{APP_VERSION}</span>
          </div>
          <h1 className="page-hero-title">{title}</h1>
          <p className="page-hero-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="capture-topbar-actions">
        <ThemeToggle />
        {actions}
      </div>
    </header>
  );
}
