"use client";

import { useEditorStore } from "@/store/editorStore";
import { formatBytes } from "@/lib/utils";

export function StatusBar() {
  const fileName = useEditorStore((s) => s.fileName);
  const fileSize = useEditorStore((s) => s.fileSize);
  const pages = useEditorStore((s) => s.pages);
  const currentPage = useEditorStore((s) => s.currentPage);
  const zoom = useEditorStore((s) => s.zoom);
  const tool = useEditorStore((s) => s.tool);
  const annotations = useEditorStore((s) => s.annotations);
  const isLoading = useEditorStore((s) => s.isLoading);

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-[var(--border)] bg-[var(--card)]/95 px-3 text-[11px] text-[var(--muted)]">
      {isLoading ? (
        <span className="animate-pulse text-amber-400/80">Loading…</span>
      ) : fileName ? (
        <>
          <span className="truncate text-foreground/70">{fileName}</span>
          <span>·</span>
          <span>{formatBytes(fileSize)}</span>
          <span>·</span>
          <span>
            Page {currentPage + 1} / {pages.length}
          </span>
          <span>·</span>
          <span>{Math.round(zoom * 100)}%</span>
          <span>·</span>
          <span className="capitalize">{tool}</span>
          <span className="ml-auto">{annotations.length} annotation{annotations.length === 1 ? "" : "s"}</span>
        </>
      ) : (
        <span>Ready — open a PDF to begin. All processing stays in your browser.</span>
      )}
    </footer>
  );
}
