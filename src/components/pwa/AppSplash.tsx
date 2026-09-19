"use client";

import { useEffect, useState } from "react";

/** Brief branded splash on first paint (PWA standalone). */
export function AppSplash() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const fadeT = window.setTimeout(() => setFade(true), 420);
    const hideT = window.setTimeout(() => setShow(false), 680);
    return () => {
      window.clearTimeout(fadeT);
      window.clearTimeout(hideT);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-[var(--background)]"
      style={{
        opacity: fade ? 0 : 1,
        transition: "opacity 260ms ease-out",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-hidden
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-[1.5rem] bg-amber-500/30 blur-xl" />
        <div className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-2xl font-black text-zinc-950 shadow-2xl shadow-amber-500/35">
          I
        </div>
      </div>
      <p className="text-[15px] font-semibold tracking-tight text-foreground">
        InstantPDF
        <span className="text-amber-600 dark:text-amber-400">Edit</span>
      </p>
    </div>
  );
}
