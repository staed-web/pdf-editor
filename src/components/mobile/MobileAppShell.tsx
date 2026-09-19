"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/site/ThemeProvider";
import { MobileTopBar } from "./MobileTopBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { AppSplash } from "@/components/pwa/AppSplash";

/**
 * Native app chrome for installed PWA (standalone) only.
 * Floating frosted tab bar + sticky blurred top bar + safe areas.
 */
export function MobileAppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppSplash />
      <div className="app-shell flex min-h-dvh flex-col bg-background text-foreground">
        <MobileTopBar />
        <OfflineIndicator />
        <main className="pb-tab-bar flex-1">{children}</main>
        <MobileBottomNav />
        <InstallBanner />
        <Toaster
          position="bottom-center"
          className="toaster-mobile"
          richColors
          closeButton
          offset={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
          mobileOffset={{
            bottom: "calc(5.5rem + env(safe-area-inset-bottom))",
          }}
        />
      </div>
    </ThemeProvider>
  );
}
