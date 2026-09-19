"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCw, Trash2 } from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
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

  useEffect(() => () => { thumbs.forEach((t) => URL.revokeObjectURL(t.url)); }, [thumbs]);

  const onFiles = async (files: File[]) => {
    const f = files.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f); setResult(null);
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
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        next.push({ srcIdx: i - 1, url: canvas.toDataURL("image/jpeg", 0.7), rot: 0 });
        page.cleanup();
      }
      doc.destroy();
      setThumbs(next);
    } catch {
      toast.error("Could not render pages");
    } finally { setBusy(false); }
  };

  const run = async () => {
    if (!file || !thumbs.length) return;
    setBusy(true);
    try {
      const order = thumbs.map((t) => t.srcIdx);
      const rotations: Record<number, number> = {};
      thumbs.forEach((t) => { if (t.rot % 360) rotations[t.srcIdx] = t.rot; });
      const bytes = await reorganizePages(await file.arrayBuffer(), order, rotations);
      setResult(bytes);
      toast.success("Organized");
    } catch {
      toast.error("Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <Button className="w-full" disabled={!thumbs.length||busy} onClick={run}>{busy?"Working…":"Apply & download"}</Button>
      }>
        <DropZone accept="application/pdf" onFiles={onFiles} label={file?file.name:"Drop a PDF to organize"} />
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
                  setThumbs((prev) => {
                    const next = [...prev];
                    const [item] = next.splice(dragFrom, 1);
                    next.splice(i, 0, item);
                    return next;
                  });
                  setDragFrom(null);
                }}
                className={cn("group relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.url} alt={`Page ${t.srcIdx+1}`} className="w-full" style={{ transform: `rotate(${t.rot}deg)` }} />
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px] text-zinc-500">
                  <span>#{i+1} · src {t.srcIdx+1}</span>
                  <span className="flex gap-1">
                    <button type="button" className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setThumbs((p)=>p.map((x,j)=>j===i?{...x,rot:(x.rot+90)%360}:x))} aria-label="Rotate"><RotateCw className="h-3.5 w-3.5" /></button>
                    <button type="button" className="rounded p-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" onClick={() => setThumbs((p)=>p.filter((_,j)=>j!==i))} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {result && <ResultBar fileName="organized.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"organized.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
