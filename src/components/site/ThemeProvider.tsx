"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/theme/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useThemeStore((s) => s.hydrate);
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => {
      const root = document.documentElement;
      root.classList.toggle("dark", mq.matches);
      root.dataset.theme = mq.matches ? "dark" : "light";
      root.style.colorScheme = mq.matches ? "dark" : "light";
    };
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [mode]);

  return <>{children}</>;
}
