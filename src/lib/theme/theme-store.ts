"use client";

import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "instantpdfedit-theme";

function resolveDark(mode: ThemeMode): boolean {
  if (typeof window === "undefined") return false;
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return mode === "dark";
}

function applyDom(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const dark = resolveDark(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
}

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  hydrate: () => void;
  cycle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "light",
  hydrated: false,
  hydrate: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      const mode =
        saved === "light" || saved === "dark" || saved === "system"
          ? saved
          : "light";
      applyDom(mode);
      set({ mode, hydrated: true });
    } catch {
      applyDom("light");
      set({ hydrated: true });
    }
  },
  setMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch { /* */ }
    applyDom(mode);
    set({ mode });
  },
  cycle: () => {
    const order: ThemeMode[] = ["light", "dark", "system"];
    const cur = get().mode;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    get().setMode(next);
  },
}));
