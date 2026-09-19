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
        "inline-flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--card)]/80 p-0.5 shadow-sm backdrop-blur-sm",
        className
      )}
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ mode: m, icon: Icon, label }) => {
        const selected = mode === m;
        return (
          <button
            key={m}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={selected}
            onClick={() => setMode(m)}
            className={cn(
              "group relative flex h-8 items-center justify-center gap-1.5 rounded-full px-2 transition-all duration-200",
              selected
                ? "bg-amber-500/15 text-amber-700 shadow-sm ring-1 ring-amber-500/30 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/35"
                : "text-[var(--muted)] hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span
              className={cn(
                "max-w-0 overflow-hidden text-[10px] font-medium opacity-0 transition-all duration-200",
                "group-hover:max-w-[3.5rem] group-hover:opacity-100 group-focus-visible:max-w-[3.5rem] group-focus-visible:opacity-100",
                selected && "max-w-[3.5rem] opacity-100"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
