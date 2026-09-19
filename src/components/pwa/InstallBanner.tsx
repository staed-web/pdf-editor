"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { IosInstallSheet } from "./InstallButton";
import { haptic } from "@/hooks/useHaptic";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "ipe-install-banner-dismissed";

export function InstallBanner() {
  const { canNativePrompt, showIosTip, promptInstall, installed } =
    useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (installed) return;
    if (!canNativePrompt && !showIosTip) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setVisible(true), 1800);
    return () => window.clearTimeout(t);
  }, [canNativePrompt, showIosTip, installed]);

  if (!visible || installed) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-3 md:bottom-6">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 p-3 shadow-xl backdrop-blur-xl">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-black text-zinc-950 shadow-md shadow-amber-500/20">
            I
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              Install InstantPDFEdit
            </p>
            <p className="truncate text-xs text-[var(--muted)]">
              Home screen · offline shell · no browser chrome
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={async () => {
              haptic("medium");
              if (canNativePrompt) {
                const ok = await promptInstall();
                if (ok) setVisible(false);
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
            aria-label="Dismiss"
            onClick={() => {
              setVisible(false);
              try {
                sessionStorage.setItem(DISMISS_KEY, "1");
              } catch {
                /* ignore */
              }
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {iosOpen && <IosInstallSheet onClose={() => setIosOpen(false)} />}
    </>
  );
}
