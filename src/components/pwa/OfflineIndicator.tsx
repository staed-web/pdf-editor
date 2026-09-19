"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.25rem)] z-[80] flex justify-center px-3 pointer-events-none"
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm backdrop-blur-md dark:text-amber-200">
        <WifiOff className="h-3.5 w-3.5" />
        Offline — app shell available
      </div>
    </div>
  );
}
