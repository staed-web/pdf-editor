"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";

export function ThemeSync() {
  const theme = useEditorStore((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (dark: boolean) => {
      root.classList.toggle("dark", dark);
      root.dataset.theme = dark ? "dark" : "light";
    };
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
      const fn = () => apply(mq.matches);
      mq.addEventListener("change", fn);
      return () => mq.removeEventListener("change", fn);
    }
    apply(theme === "dark");
  }, [theme]);

  return null;
}
