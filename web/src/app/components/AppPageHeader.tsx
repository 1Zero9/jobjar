import { PageBrandStrip } from "@/app/components/PageBrandStrip";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  iconClassName?: string;
  className?: string;
  scopeLabel?: string | null;
};

export function AppPageHeader({
  title,
  subtitle,
  icon,
  iconClassName = "",
  className = "",
  scopeLabel = null,
}: Props) {
  return (
    <header className={`page-hero-card ${className}`.trim()}>
      <PageBrandStrip icon={icon} iconClassName={iconClassName} />
      <div className="page-hero-copy">
        <h1 className="page-hero-title">{title}</h1>
        <p className="page-hero-subtitle">{subtitle}</p>
      </div>
      {scopeLabel ? (
        <div className="capture-topbar-actions">
          <span className="location-scope-chip" title={`Current location scope: ${scopeLabel}`}>
            <span>Location</span>
            <strong>{scopeLabel}</strong>
          </span>
        </div>
      ) : null}
    </header>
  );
}
