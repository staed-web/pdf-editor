"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore, type ThemeMode } from "@/lib/theme/theme-store";
import { cn } from "@/lib/utils";

const OPTIONS: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: "light", icon: Sun, label: "Light" },
  { mode: "dark", icon: Moon, label: "Dark" },
  { mode: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-700 dark:bg-zinc-800/80",
        className
      )}
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ mode: m, icon: Icon, label }) => (
        <button
          key={m}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={mode === m}
          onClick={() => setMode(m)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-all",
            mode === m
              ? "bg-white text-amber-600 shadow-sm dark:bg-zinc-900 dark:text-amber-400"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
