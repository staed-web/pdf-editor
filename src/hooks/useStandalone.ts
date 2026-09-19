"use client";

import { useEffect, useState } from "react";

/** True when running as installed PWA (standalone / iOS home screen). */
export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

/**
 * Detect installed PWA. Starts false (SSR-safe); updates after mount.
 * Pair with MarketingShell’s mount gate to avoid chrome flash.
 */
export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const sync = () => {
      const s = isStandaloneMode();
      setStandalone(s);
      document.documentElement.dataset.standalone = s ? "1" : "0";
      document.documentElement.classList.toggle("standalone", s);
    };
    sync();
    const mqs = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: fullscreen)"),
      window.matchMedia("(display-mode: window-controls-overlay)"),
    ];
    mqs.forEach((mq) => mq.addEventListener?.("change", sync));
    return () => mqs.forEach((mq) => mq.removeEventListener?.("change", sync));
  }, []);

  return standalone;
}
