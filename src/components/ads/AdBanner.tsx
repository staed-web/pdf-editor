"use client";

import { useEffect, useRef } from "react";
import { useStandalone } from "@/hooks/useStandalone";
import { cn } from "@/lib/utils";

export type AdBannerVariant = "leaderboard" | "rectangle" | "infeed";

const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-9372118866074955";

const SLOT_ENV: Record<AdBannerVariant, string | undefined> = {
  leaderboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD,
  infeed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED,
  rectangle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE,
};

const VARIANT_STYLES: Record<
  AdBannerVariant,
  { minH: string; maxW: string; framePad: string }
> = {
  leaderboard: {
    minH: "min-h-[90px]",
    maxW: "max-w-[728px]",
    framePad: "p-2 sm:p-3",
  },
  rectangle: {
    minH: "min-h-[250px]",
    maxW: "max-w-[300px]",
    framePad: "p-3",
  },
  infeed: {
    minH: "min-h-[100px] sm:min-h-[90px]",
    maxW: "max-w-4xl",
    framePad: "p-2 sm:p-3",
  },
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdBanner({
  variant = "leaderboard",
  className,
  slot,
}: {
  variant?: AdBannerVariant;
  className?: string;
  /** Override env slot for this instance */
  slot?: string;
}) {
  const standalone = useStandalone();
  const pushed = useRef(false);

  const resolvedSlot = (slot ?? SLOT_ENV[variant] ?? "").trim();
  const hasSlot = resolvedSlot.length > 0;
  const styles = VARIANT_STYLES[variant];

  useEffect(() => {
    if (standalone || !hasSlot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense may throw if script not ready; frame still reserves space.
    }
  }, [standalone, hasSlot, resolvedSlot]);

  if (standalone) return null;

  return (
    <aside
      className={cn(
        "mx-auto w-full",
        styles.maxW,
        className
      )}
      aria-label="Sponsored"
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow-[var(--shadow-sm)]",
          "dark:bg-[var(--panel)]",
          styles.framePad
        )}
      >
        <p className="mb-1.5 px-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]/80">
          Sponsored
        </p>
        <div
          className={cn(
            "relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-[var(--panel)]/60 dark:bg-[var(--card)]/40",
            styles.minH
          )}
        >
          {hasSlot ? (
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", minHeight: "inherit" }}
              data-ad-client={ADSENSE_CLIENT}
              data-ad-slot={resolvedSlot}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          ) : (
            <span className="sr-only">Advertisement placeholder</span>
          )}
        </div>
      </div>
    </aside>
  );
}
