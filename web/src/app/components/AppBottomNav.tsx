"use client";

import { HelpIcon, HomeIcon, LogIcon, MoreIcon, StatsIcon, TasksIcon } from "@/lib/icons";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  primary?: boolean;
};

type Props = {
  childMode: boolean;
  canLog: boolean;
  canSeeReports: boolean;
};

export function AppBottomNav({ childMode, canLog, canSeeReports }: Props) {
  const pathname = usePathname();
  const items = childMode ? buildChildItems() : buildStandardItems(canLog, canSeeReports);

  return (
    <nav className={`app-bottom-nav glass-surface ${childMode ? "app-bottom-nav-child" : ""}`.trim()} aria-label="Primary">
      <div className="app-bottom-nav-inner">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`app-bottom-nav-link ${item.primary ? "app-bottom-nav-link-primary" : ""} ${active ? "is-active" : ""}`.trim()}
              aria-current={active ? "page" : undefined}
            >
              <span className="app-bottom-nav-icon">
                <Icon width="22" height="22" />
              </span>
              <span className="app-bottom-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function buildStandardItems(canLog: boolean, canSeeReports: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/tasks", label: "Tasks", icon: TasksIcon },
  ];

  if (canLog) {
    items.push({ href: "/log", label: "Log", icon: LogIcon, primary: true });
  }

  if (canSeeReports) {
    items.push({ href: "/stats", label: "Stats", icon: StatsIcon });
  } else if (!canLog) {
    items.push({ href: "/help", label: "Help", icon: HelpIcon });
  }

  items.push({ href: "/more", label: "More", icon: MoreIcon });

  return items;
}

function buildChildItems(): NavItem[] {
  return [
    { href: "/tasks", label: "My Jobs", icon: TasksIcon },
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/more", label: "More", icon: MoreIcon },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
