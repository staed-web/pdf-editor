"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/site/ThemeProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MobileTopBar } from "./MobileTopBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { AppSplash } from "@/components/pwa/AppSplash";
import { InstallButton } from "@/components/pwa/InstallButton";

/**
 * App-like chrome on &lt;md; richer marketing header/footer on desktop.
 * Bottom tab bar + sticky blurred top bar + safe areas.
 */
export function MobileAppShell({
  children,
  hideFooterOnMobile = true,
}: {
  children: ReactNode;
  hideFooterOnMobile?: boolean;
}) {
  return (
    <ThemeProvider>
      <AppSplash />
      <div className="flex min-h-dvh flex-col bg-background text-foreground app-shell">
        {/* Desktop marketing chrome */}
        <div className="hidden md:block">
          <SiteHeader />
        </div>
        {/* Mobile app chrome */}
        <MobileTopBar />
        <OfflineIndicator />

        <main className="flex-1 pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>

        <div className={hideFooterOnMobile ? "hidden md:block" : undefined}>
          <SiteFooter />
        </div>

        <MobileBottomNav />
        <InstallBanner />

        {/* Desktop install affordance in floating corner when available */}
        <div className="fixed bottom-6 right-6 z-40 hidden md:block">
          <InstallButton label="Install app" />
        </div>

        <Toaster
          position="bottom-center"
          className="toaster-mobile"
          richColors
          closeButton
          offset={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
          mobileOffset={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
        />
      </div>
    </ThemeProvider>
  );
}
