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
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
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
          className="absolute left-3 top-3 z-[60] hidden rounded-lg bg-zinc-900/80 px-2 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur hover:bg-zinc-800 sm:inline-flex"
        >
          ← InstantPDFEdit
        </Link>
        <EditorShell />
      </div>
    </ThemeProvider>
  );
}
