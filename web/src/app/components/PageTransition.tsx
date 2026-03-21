"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("page-enter");
    void el.offsetHeight; // force reflow so the animation restarts
    el.classList.add("page-enter");
  }, [pathname]);

  return (
    <div ref={ref} className="app-shell-content page-enter">
      {children}
    </div>
  );
}
