"use client";

import dynamic from "next/dynamic";
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
      <EditorShell />
    </ThemeProvider>
  );
}
