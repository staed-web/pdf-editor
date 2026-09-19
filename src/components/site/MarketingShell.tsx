"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useStandalone } from "@/hooks/useStandalone";
import { WebsiteShell } from "@/components/site/WebsiteShell";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { ThemeProvider } from "@/components/site/ThemeProvider";

/**
 * Branch chrome by install state:
 * - Normal browser (incl. mobile) → polished website (header/footer)
 * - Installed PWA standalone → native app shell (tabs, frosted bars)
 *
 * Waits until mount so SSR/hydration never flash the wrong chrome.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  const standalone = useStandalone();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <ThemeProvider>
        <div className="min-h-dvh bg-background" suppressHydrationWarning>
          <main className="flex-1">{children}</main>
        </div>
      </ThemeProvider>
    );
  }

  if (standalone) {
    return <MobileAppShell>{children}</MobileAppShell>;
  }

  return <WebsiteShell>{children}</WebsiteShell>;
}
