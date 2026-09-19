"use client";

import dynamic from "next/dynamic";

const EditorShell = dynamic(
  () =>
    import("@/components/editor/EditorShell").then((m) => m.EditorShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600" />
          Loading editor…
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <EditorShell />;
}
