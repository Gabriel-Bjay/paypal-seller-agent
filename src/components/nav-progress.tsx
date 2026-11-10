"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Dispatch this window event before navigating in code (router.push) to show the bar. */
export const NAV_START = "nav-start";

/**
 * A thin animated bar at the top of the page from the moment an internal link is clicked
 * until the new page arrives, so slow PayPal-backed pages never look frozen.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => setLoading(false), [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as HTMLElement).closest("a");
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname !== window.location.pathname) setLoading(true);
    };
    const onStart = () => setLoading(true);
    document.addEventListener("click", onClick);
    window.addEventListener(NAV_START, onStart);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(NAV_START, onStart);
    };
  }, []);

  if (!loading) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-indigo-100" role="progressbar" aria-label="Loading page">
      <div className="h-full w-1/3 animate-[navprogress_1.1s_ease-in-out_infinite] rounded-full bg-indigo-600" />
    </div>
  );
}
