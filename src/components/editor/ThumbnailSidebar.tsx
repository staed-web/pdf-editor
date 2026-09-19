"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function ThumbnailSidebar() {
  const pdfDoc = useEditorStore((s) => s.pdfDoc);
  const pages = useEditorStore((s) => s.pages);
  const currentPage = useEditorStore((s) => s.currentPage);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);
  const reorderPages = useEditorStore((s) => s.reorderPages);
  const show = useEditorStore((s) => s.settings.showThumbnails);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  if (!show || !pages.length) return null;

  return (
    <aside className="flex w-40 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
      <div className="border-b border-[var(--border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Pages
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-3">
          {pages.map((page, i) => (
            <Thumbnail
              key={page.id}
              pageIndex={i}
              sourceIndex={page.sourceIndex}
              rotation={page.rotation}
              active={i === currentPage}
              pdfDoc={pdfDoc}
              onSelect={() => setCurrentPage(i)}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom !== null && dragFrom !== i) reorderPages(dragFrom, i);
                setDragFrom(null);
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

function Thumbnail({
  pageIndex,
  sourceIndex,
  rotation,
  active,
  pdfDoc,
  onSelect,
  ...drag
}: {
  pageIndex: number;
  sourceIndex: number;
  rotation: number;
  active: boolean;
  pdfDoc: import("pdfjs-dist").PDFDocumentProxy | null;
  onSelect: () => void;
} & React.HTMLAttributes<HTMLButtonElement>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (sourceIndex < 0 || !pdfDoc) {
        const ctx = canvas.getContext("2d")!;
        canvas.width = 120;
        canvas.height = 160;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 120, 160);
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "12px sans-serif";
        ctx.fillText("Blank", 40, 80);
        setReady(true);
        return;
      }
      try {
        const page = await pdfDoc.getPage(sourceIndex + 1);
        const base = page.getViewport({ scale: 1, rotation: rotation % 360 });
        const scale = 120 / base.width;
        const viewport = page.getViewport({ scale, rotation: rotation % 360 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setReady(true);
      } catch {
        /* ignore */
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, sourceIndex, rotation]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 transition",
        active
          ? "border-amber-500 ring-2 ring-amber-500/30"
          : "border-zinc-800 hover:border-zinc-600"
      )}
      {...drag}
    >
      <canvas
        ref={canvasRef}
        className={cn("mx-auto block max-w-full rounded", !ready && "min-h-[100px] animate-pulse bg-zinc-800")}
      />
      <span className="mt-1 block text-center text-[10px] font-medium text-zinc-400">
        {pageIndex + 1}
      </span>
    </button>
  );
}
