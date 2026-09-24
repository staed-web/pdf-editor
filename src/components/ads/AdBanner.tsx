"use client";

import { useEffect, useRef, useState } from "react";
import { useStandalone } from "@/hooks/useStandalone";
import {
  ADSENSE_CLIENT,
  type AdBannerVariant,
  isAdSlotConfigured,
  resolveAdSlot,
} from "@/lib/ads";
import { cn } from "@/lib/utils";
import { PrivacySoftCta } from "./PrivacySoftCta";

export type { AdBannerVariant };

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

/**
 * Sponsored slot that only mounts when a real AdSense slot ID is configured.
 * Missing slot → optional soft privacy CTA (no empty Sponsored chrome).
 * Unfilled AdSense responses collapse to nothing after a short wait.
 */
export function AdBanner({
  variant = "leaderboard",
  className,
  slot,
  privacyFallback = false,
}: {
  variant?: AdBannerVariant;
  className?: string;
  /** Override env slot for this instance */
  slot?: string;
  /**
   * When no slot ID is configured, show a compact privacy note instead of
   * nothing. Use sparingly (one per page) — not an upsell wall.
   */
  privacyFallback?: boolean;
}) {
  const standalone = useStandalone();
  const pushed = useRef(false);
  const insRef = useRef<HTMLModElement>(null);
  const [filled, setFilled] = useState(false);
  const [giveUp, setGiveUp] = useState(false);

  const resolvedSlot = resolveAdSlot(variant, slot);
  const hasSlot = isAdSlotConfigured(variant, slot);
  const styles = VARIANT_STYLES[variant];

  useEffect(() => {
    if (standalone || !hasSlot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // Script may not be ready yet.
    }
  }, [standalone, hasSlot, resolvedSlot]);

  useEffect(() => {
    if (standalone || !hasSlot) return;
    const el = insRef.current;
    if (!el) return;

    const check = () => {
      const status = el.getAttribute("data-ad-status");
      if (status === "filled") {
        setFilled(true);
        return true;
      }
      if (status === "unfilled") {
        setGiveUp(true);
        return true;
      }
      const iframe = el.querySelector("iframe");
      if (iframe) {
        const h =
          iframe.clientHeight || Number(iframe.getAttribute("height")) || 0;
        if (h > 20) {
          setFilled(true);
          return true;
        }
      }
      return false;
    };

    if (check()) return;

    const mo = new MutationObserver(() => {
      check();
    });
    mo.observe(el, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
      childList: true,
      subtree: true,
    });

    const t = window.setTimeout(() => {
      if (!check()) setGiveUp(true);
    }, 4000);

    return () => {
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, [standalone, hasSlot, resolvedSlot]);

  if (standalone) return null;

  if (!hasSlot) {
    return privacyFallback ? <PrivacySoftCta className={className} /> : null;
  }

  if (giveUp) return null;

  return (
    <aside
      className={cn(
        "mx-auto w-full transition-[max-height,opacity,margin] duration-300",
        styles.maxW,
        !filled &&
          "pointer-events-none max-h-0 overflow-hidden opacity-0 !m-0 !p-0",
        filled && "opacity-100",
        className
      )}
      aria-label="Sponsored"
      aria-hidden={!filled}
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
            filled && styles.minH
          )}
        >
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: "block", width: "100%" }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={resolvedSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </aside>
  );
}
