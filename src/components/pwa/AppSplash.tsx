"use client";

import { useEffect, useState } from "react";

/** Brief branded splash on first paint while theme/SW hydrate. */
export function AppSplash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), 520);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-[var(--background)] transition-opacity duration-300"
      aria-hidden
    >
      <div className="h-16 w-16 animate-pulse rounded-[1.35rem] bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 shadow-2xl shadow-amber-500/30" />
      <p className="text-sm font-semibold tracking-tight text-foreground">
        InstantPDF<span className="text-amber-600 dark:text-amber-400">Edit</span>
      </p>
    </div>
  );
}
