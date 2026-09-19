"use client";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";

/** Marketing + tool pages: native app shell on mobile, rich chrome on desktop. */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return <MobileAppShell>{children}</MobileAppShell>;
}
