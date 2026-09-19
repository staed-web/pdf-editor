"use client";

import { useState } from "react";
import { Download, Share, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { haptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";

export function InstallButton({
  className,
  variant = "outline",
  size = "sm",
  label = "Install app",
}: {
  className?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
  label?: string;
}) {
  const { canNativePrompt, showIosTip, installed, promptInstall } =
    useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);

  if (installed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300",
          className
        )}
      >
        <Check className="h-3.5 w-3.5" />
        Installed
      </span>
    );
  }

  if (!canNativePrompt && !showIosTip) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("touch-target", className)}
        onClick={async () => {
          haptic("light");
          if (canNativePrompt) {
            await promptInstall();
          } else {
            setIosOpen(true);
          }
        }}
      >
        <Download className="h-4 w-4" />
        {label}
      </Button>

      {iosOpen && (
        <IosInstallSheet onClose={() => setIosOpen(false)} />
      )}
    </>
  );
}

export function IosInstallSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Install InstantPDFEdit"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-in rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl safe-pb"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              Add to Home Screen
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Install InstantPDFEdit for a full-screen, app-like experience on
              iPhone &amp; iPad.
            </p>
          </div>
          <button
            type="button"
            className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="space-y-3 text-sm text-foreground/90">
          <li className="flex gap-3 rounded-2xl bg-[var(--background)] p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-300">
              1
            </span>
            <span>
              Tap the <Share className="inline h-4 w-4 text-sky-500" /> Share
              button in Safari’s toolbar.
            </span>
          </li>
          <li className="flex gap-3 rounded-2xl bg-[var(--background)] p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-300">
              2
            </span>
            <span>
              Scroll and choose <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex gap-3 rounded-2xl bg-[var(--background)] p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-300">
              3
            </span>
            <span>Confirm — InstantPDFEdit opens in standalone mode.</span>
          </li>
        </ol>
        <Button className="mt-4 w-full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>
  );
}
