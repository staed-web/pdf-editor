"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { ensurePdfWorker, loadPdfDocument } from "@/lib/pdf/loader";
import { isPdfFile } from "@/lib/download";

const tool = getTool("pdf-reader")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<Awaited<ReturnType<typeof loadPdfDocument>> | null>(null);

  const render = async (n: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    const p = await doc.getPage(n);
    const viewport = p.getViewport({ scale: 1.25 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await p.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    p.cleanup();
  };

  const onFiles = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setBusy(true);
    try {
      if (docRef.current) docRef.current.destroy();
      ensurePdfWorker();
      const doc = await loadPdfDocument(await f.arrayBuffer());
      docRef.current = doc;
      setFile(f);
      setTotal(doc.numPages);
      setPage(1);
      await render(1);
      toast.success(`${doc.numPages} pages`);
    } catch {
      toast.error("Failed to open");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (docRef.current && page >= 1) render(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => () => { docRef.current?.destroy(); }, []);

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Private lightweight viewer — nothing leaves your device.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page<=1} onClick={()=>setPage((p)=>p-1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page>=total} onClick={()=>setPage((p)=>p+1)}>Next</Button>
          </div>
          <p className="text-xs">{total ? `Page ${page} / ${total}` : "Load a PDF"}</p>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={onFiles} label={file?file.name:"Drop a PDF to read"} />
        {busy && <p className="text-sm text-zinc-500">Opening…</p>}
        <div className="overflow-auto rounded-2xl border border-zinc-200 bg-zinc-100 p-2 dark:border-zinc-800 dark:bg-zinc-950">
          <canvas ref={canvasRef} className="mx-auto max-w-full shadow" />
        </div>
      </ToolShell>
    </MarketingShell>
  );
}
