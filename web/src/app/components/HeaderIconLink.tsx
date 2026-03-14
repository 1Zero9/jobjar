import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  label: string;
  children: ReactNode;
  className?: string;
};

export function HeaderIconLink({ href, label, children, className = "" }: Props) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`action-btn subtle quiet icon-only header-tool-link ${className}`.trim()}
    >
      <span className="theme-toggle-icon" aria-hidden="true">{children}</span>
      <span className="theme-toggle-sr">{label}</span>
    </Link>
  );
}
