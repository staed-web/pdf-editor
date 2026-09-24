"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  RotateCw,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ToolActionBar } from "@/components/tools/ToolActionBar";
import {
  ProcessSuccess,
  SoftLimitsNote,
} from "@/components/tools/process";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { reorganizePages } from "@/lib/pdf/ops";
import { ensurePdfWorker, loadPdfDocument } from "@/lib/pdf/loader";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { cn } from "@/lib/utils";

const tool = getTool("organize")!;

type Thumb = { srcIdx: number; url: string; rot: number };

export default function OrganizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  useEffect(
    () => () => {
      thumbs.forEach((t) => URL.revokeObjectURL(t.url));
    },
    [thumbs]
  );

  const resetAll = () => {
    setFile(null);
    setThumbs([]);
    setResult(null);
  };

  const moveThumb = (from: number, to: number) => {
    if (to < 0 || to >= thumbs.length || from === to) return;
    setThumbs((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const onFiles = async (files: File[]) => {
    const f = files.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f);
    setResult(null);
    setBusy(true);
    try {
      ensurePdfWorker();
      const buf = await f.arrayBuffer();
      const doc = await loadPdfDocument(buf);
      const next: Thumb[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({
          canvasContext: canvas.getContext("2d")!,
          viewport,
        }).promise;
        next.push({
          srcIdx: i - 1,
          url: canvas.toDataURL("image/jpeg", 0.7),
          rot: 0,
        });
        page.cleanup();
      }
      doc.destroy();
      setThumbs(next);
    } catch {
      toast.error("Could not render pages");
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!file || !thumbs.length) return;
    setBusy(true);
    try {
      const order = thumbs.map((t) => t.srcIdx);
      const rotations: Record<number, number> = {};
      thumbs.forEach((t) => {
        if (t.rot % 360) rotations[t.srcIdx] = t.rot;
      });
      const bytes = await reorganizePages(
        await file.arrayBuffer(),
        order,
        rotations
      );
      setResult(bytes);
      toast.success("Organized");
    } catch {
      toast.error("Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        actionBar={
          <ToolActionBar>
            <Button
              className="min-h-11 w-full flex-1"
              disabled={!thumbs.length || busy}
              onClick={run}
            >
              {busy ? "Working…" : "Apply changes"}
            </Button>
          </ToolActionBar>
        }
        options={
          <>
            <p className="text-xs text-zinc-500">
              On phones, use the arrows to reorder pages. On desktop you can also
              drag thumbnails.
            </p>
            <SoftLimitsNote />
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={onFiles}
          label={file ? file.name : "Drop a PDF to organize"}
          pickerLabel="Choose PDF"
        />
        {thumbs.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {thumbs.map((t, i) => (
              <div
                key={`${t.srcIdx}-${i}`}
                draggable
                onDragStart={() => setDragFrom(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragFrom == null || dragFrom === i) return;
                  moveThumb(dragFrom, i);
                  setDragFrom(null);
                }}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
                  dragFrom === i && "opacity-60 ring-2 ring-amber-400/50"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.url}
                  alt={`Page ${t.srcIdx + 1}`}
                  className="w-full"
                  style={{ transform: `rotate(${t.rot}deg)` }}
                />
                <div className="flex items-center justify-between gap-1 px-1.5 py-1.5 text-[11px] text-zinc-500">
                  <span className="shrink-0 tabular-nums">
                    #{i + 1}
                    <span className="text-zinc-400"> · src {t.srcIdx + 1}</span>
                  </span>
                  <span className="flex flex-wrap items-center justify-end gap-0.5">
                    <button
                      type="button"
                      className="touch-target flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 sm:h-8 sm:w-8"
                      disabled={i === 0}
                      onClick={() => moveThumb(i, i - 1)}
                      aria-label="Move earlier"
                      title="Move earlier"
                    >
                      <ChevronUp className="hidden h-4 w-4 sm:block" />
                      <ChevronLeft className="h-4 w-4 sm:hidden" />
                    </button>
                    <button
                      type="button"
                      className="touch-target flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 sm:h-8 sm:w-8"
                      disabled={i === thumbs.length - 1}
                      onClick={() => moveThumb(i, i + 1)}
                      aria-label="Move later"
                      title="Move later"
                    >
                      <ChevronDown className="hidden h-4 w-4 sm:block" />
                      <ChevronRight className="h-4 w-4 sm:hidden" />
                    </button>
                    <button
                      type="button"
                      className="touch-target flex h-9 w-9 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:h-8 sm:w-8"
                      onClick={() =>
                        setThumbs((p) =>
                          p.map((x, j) =>
                            j === i ? { ...x, rot: (x.rot + 90) % 360 } : x
                          )
                        )
                      }
                      aria-label="Rotate"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="touch-target flex h-9 w-9 items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 sm:h-8 sm:w-8"
                      onClick={() =>
                        setThumbs((p) => p.filter((_, j) => j !== i))
                      }
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {result && (
          <ProcessSuccess
            fileName="organized.pdf"
            size={result.byteLength}
            blob={result}
            fromTool="organize"
            onDownload={() => downloadBytes(result, "organized.pdf")}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
