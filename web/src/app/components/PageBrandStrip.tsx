import { APP_VERSION } from "@/lib/app-version";
import { BrandMarkIcon } from "@/lib/icons";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  iconClassName?: string;
  trailing?: ReactNode;
  className?: string;
};

export function PageBrandStrip({
  icon,
  iconClassName = "",
  trailing,
  className = "",
}: Props) {
  return (
    <div className={`page-brand-strip page-hero-topline ${className}`.trim()}>
      <div className="page-brand-strip-main page-hero-topline-main">
        {icon ? <div className={`page-hero-icon ${iconClassName}`.trim()}>{icon}</div> : null}
        <div className="page-hero-brand-row">
          <Link href="/" className="page-brand-link" aria-label="Go to home">
            <span className="page-brand-mark" aria-hidden="true">
              <BrandMarkIcon width="18" height="18" />
            </span>
            <span className="page-hero-brand">JobJar</span>
          </Link>
        </div>
      </div>
      {trailing ? <div className="page-brand-strip-trailing">{trailing}</div> : null}
    </div>
  );
}
