"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/site/ThemeProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { InstallButton } from "@/components/pwa/InstallButton";

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
        <SiteFooter />
        {/* Subtle install CTA — does not replace layout */}
        <InstallBanner website />
        <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
          <InstallButton label="Install app" />
        </div>
        <Toaster position="bottom-center" richColors closeButton />
      </div>
    </ThemeProvider>
  );
}
