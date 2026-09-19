"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ThemeProvider } from "@/components/site/ThemeProvider";

const EditorShell = dynamic(
  () =>
    import("@/components/editor/EditorShell").then((m) => m.EditorShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background text-sm text-[var(--muted)]">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600" />
        Loading InstantPDFEdit…
      </div>
    ),
  }
);

export default function EditPage() {
  return (
    <ThemeProvider>
      <div className="relative">
        <Link
          href="/"
          className="absolute left-3 top-3 z-[60] hidden rounded-lg border border-[var(--border)] bg-[var(--card)]/90 px-2 py-1 text-[11px] font-medium text-foreground backdrop-blur hover:bg-[var(--background)] sm:inline-flex"
        >
          ← InstantPDFEdit
        </Link>
        <EditorShell />
      </div>
    </ThemeProvider>
  );
}
