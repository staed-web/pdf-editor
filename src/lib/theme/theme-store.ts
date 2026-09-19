"use client";

import { create } from "zustand";

export type ThemeMode = "light" | "dark";

export const STORAGE_KEY = "instantpdfedit-theme";

function resolveDark(mode: ThemeMode): boolean {
  return mode === "dark";
}

/** Normalize legacy "system" (or anything else) to light/dark. */
function normalizeMode(raw: string | null): ThemeMode {
  if (raw === "dark") return "dark";
  if (raw === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

/** Apply resolved dark/light to <html> — call on hydrate and setMode. */
export function applyDom(mode: ThemeMode) {
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
  reapply: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "light",
  hydrated: false,
  hydrate: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const mode = normalizeMode(saved);
      if (saved === "system") {
        try {
          localStorage.setItem(STORAGE_KEY, mode);
        } catch {
          /* ignore */
        }
      }
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
    } catch {
      /* ignore quota / private mode */
    }
    applyDom(mode);
    set({ mode });
  },
  reapply: () => {
    applyDom(get().mode);
  },
  cycle: () => {
    const next = get().mode === "light" ? "dark" : "light";
    get().setMode(next);
  },
}));
