"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/site/ThemeProvider";
import { MobileTopBar } from "./MobileTopBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { AppSplash } from "@/components/pwa/AppSplash";

/**
 * Native app chrome for installed PWA only — edge-to-edge top/bottom docks.
 */
export function MobileAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const isEditor = pathname.startsWith("/edit");
  return (
    <ThemeProvider>
      <AppSplash />
      <div
        className="app-shell flex min-h-dvh flex-col bg-background text-foreground"
        data-editor={isEditor ? "1" : "0"}
      >
        <MobileTopBar />
        <OfflineIndicator />
        {/* Reserve space for fixed top (safe + 3rem) and bottom dock */}
        <main className="app-shell-main flex-1">{children}</main>
        <MobileBottomNav />
        <InstallBanner />
        <Toaster
          position="bottom-center"
          className="toaster-mobile"
          richColors
          closeButton
          offset={{ bottom: "calc(3.75rem + env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          mobileOffset={{
            bottom: "calc(3.75rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
          }}
        />
      </div>
    </ThemeProvider>
  );
}
