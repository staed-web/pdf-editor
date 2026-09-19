"use client";

import { useEffect } from "react";
import { applyDom, useThemeStore } from "@/lib/theme/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useThemeStore((s) => s.hydrate);
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // When in system mode: apply immediately and re-apply on OS preference change.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyDom("system");
    fn(); // initial apply when switching TO system
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [mode]);

  return <>{children}</>;
}
