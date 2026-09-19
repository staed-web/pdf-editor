"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/useHaptic";

export function MobilePagesDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pdfDoc = useEditorStore((s) => s.pdfDoc);
  const pages = useEditorStore((s) => s.pages);
  const currentPage = useEditorStore((s) => s.currentPage);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Pages"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        aria-label="Close pages"
        onClick={onClose}
      />
      <aside
        className="animate-sheet relative z-10 flex h-full w-[min(82vw,300px)] flex-col border-r border-[var(--hairline)] bg-[var(--card)] shadow-2xl"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-3.5 py-3">
          <div>
            <p className="text-sm font-semibold tracking-tight">Pages</p>
            <p className="text-[11px] text-[var(--muted)]">
              {pages.length} {pages.length === 1 ? "page" : "pages"}
            </p>
          </div>
          <button
            type="button"
            className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-3">
          <div className="grid grid-cols-2 gap-2.5">
            {pages.map((page, i) => (
              <Thumb
                key={page.id}
                pageIndex={i}
                sourceIndex={page.sourceIndex}
                rotation={page.rotation}
                active={i === currentPage}
                pdfDoc={pdfDoc}
                onSelect={() => {
                  haptic("light");
                  setCurrentPage(i);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Thumb({
  pageIndex,
  sourceIndex,
  rotation,
  active,
  pdfDoc,
  onSelect,
}: {
  pageIndex: number;
  sourceIndex: number;
  rotation: number;
  active: boolean;
  pdfDoc: import("pdfjs-dist").PDFDocumentProxy | null;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (sourceIndex < 0 || !pdfDoc) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = 120;
        canvas.height = 160;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 120, 160);
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "12px sans-serif";
        ctx.fillText("Blank", 40, 80);
        return;
      }
      try {
        const page = await pdfDoc.getPage(sourceIndex + 1);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1, rotation: rotation % 360 });
        const scale = 120 / base.width;
        const viewport = page.getViewport({ scale, rotation: rotation % 360 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        /* ignore render errors */
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
        "overflow-hidden rounded-xl border-2 bg-white p-1 shadow-[var(--shadow-sm)] transition",
        active
          ? "border-amber-500 ring-2 ring-amber-500/25"
          : "border-transparent"
      )}
    >
      <canvas ref={canvasRef} className="h-auto w-full" />
      <span
        className={cn(
          "mt-1 block text-center text-[10px] font-medium",
          active
            ? "text-amber-700 dark:text-amber-400"
            : "text-[var(--muted)]"
        )}
      >
        {pageIndex + 1}
      </span>
    </button>
  );
}
