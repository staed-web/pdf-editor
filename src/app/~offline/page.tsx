"use client";

import Link from "next/link";
import { WifiOff, Home, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground safe-pad">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/25">
        <WifiOff className="h-7 w-7 text-zinc-950" />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">You’re offline</h1>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          InstantPDFEdit’s app shell is cached, but tools that need a PDF file
          require a connection or a file you’ve already opened. Reconnect to
          process new documents.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            Home
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/tools">
            <Wrench className="h-4 w-4" />
            Tools
          </Link>
        </Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    </div>
  );
}
