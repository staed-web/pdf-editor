"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/site/ThemeProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";

/**
 * Classic responsive website chrome — used in normal browser (including
 * mobile Safari/Chrome). No bottom tab bar, no fake-app shell.
 */
export function WebsiteShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <SiteHeader />
        <OfflineIndicator />
        <main className="flex-1">{children}</main>
        {/* In-flow install prompt (website mode) — does not cover tool cards */}
        <InstallBanner website />
        <SiteFooter />
        <Toaster position="bottom-center" richColors closeButton />
      </div>
    </ThemeProvider>
  );
}
