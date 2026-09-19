"use client";

import { Toaster } from "sonner";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ThemeProvider } from "./ThemeProvider";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="flex min-h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster position="bottom-right" richColors closeButton />
      </div>
    </ThemeProvider>
  );
}
