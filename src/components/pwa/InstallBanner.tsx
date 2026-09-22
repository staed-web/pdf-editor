"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { IosInstallSheet } from "./InstallButton";
import { haptic } from "@/hooks/useHaptic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "ipe-install-dismissed-at";
const SESSION_KEY = "ipe-install-shown";
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return true;
    return Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

/**
 * Dismissible install prompt.
 * - At most once per browser session
 * - Dismiss persisted in localStorage (30 days)
 * - `website` — in document flow (won't cover tool cards)
 * - Default — fixed above PWA tab bar
 */
export function InstallBanner({ website = false }: { website?: boolean }) {
  const { canNativePrompt, showIosTip, promptInstall, installed, standalone } =
    useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (installed || standalone) return;
    if (!canNativePrompt && !showIosTip) return;
    if (dismissedRecently()) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => {
      setVisible(true);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 2200);
    return () => window.clearTimeout(t);
  }, [canNativePrompt, showIosTip, installed, standalone]);

  if (!visible || installed || standalone) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const card = (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-[1.25rem] border border-[var(--glass-border)] p-3 shadow-[var(--shadow-float)]",
        website ? "max-w-6xl" : "max-w-md"
      )}
      style={{
        background: "var(--glass)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
      }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-black text-zinc-950 shadow-md shadow-amber-500/25">
        I
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          Install InstantPDFEdit
        </p>
        <p className="truncate text-xs text-[var(--muted)]">
          Home screen · offline shell · app chrome
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0 rounded-full"
        onClick={async () => {
          haptic("medium");
          if (canNativePrompt) {
            const ok = await promptInstall();
            if (ok) dismiss();
          } else {
            setIosOpen(true);
          }
        }}
      >
        <Download className="h-3.5 w-3.5" />
        Install
      </Button>
      <button
        type="button"
        className="touch-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        aria-label="Dismiss install prompt"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <>
      {website ? (
        <div
          className="mx-auto w-full px-4 py-3 sm:px-6"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto flex justify-center">{card}</div>
        </div>
      ) : (
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3",
            "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6"
          )}
        >
          <div className="pointer-events-auto">{card}</div>
        </div>
      )}
      {iosOpen && <IosInstallSheet onClose={() => setIosOpen(false)} />}
    </>
  );
}
