"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { splitByRanges, splitEveryPage, getPageCount } from "@/lib/pdf/ops";
import { downloadBytes, downloadZip, isPdfFile } from "@/lib/download";

const tool = getTool("split")!;

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [mode, setMode] = useState<"ranges" | "every">("ranges");
  const [ranges, setRanges] = useState("1-1");
  const [busy, setBusy] = useState(false);
  const [zipReady, setZipReady] = useState<{ name: string; data: Uint8Array }[] | null>(null);

  const onFiles = async (files: File[]) => {
    const f = files.find(isPdfFile);
    if (!f) return toast.error("Please drop a PDF");
    setFile(f);
    setZipReady(null);
    try {
      const n = await getPageCount(await f.arrayBuffer());
      setPages(n);
      setRanges(`1-${n}`);
    } catch {
      toast.error("Could not read PDF");
    }
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let parts: { name: string; bytes: Uint8Array }[];
      if (mode === "every") {
        parts = await splitEveryPage(buf);
      } else {
        const parsed = ranges.split(/[,\s]+/).filter(Boolean).map((r) => {
          const m = r.match(/^(\d+)(?:-(\d+))?$/);
          if (!m) throw new Error(`Bad range: ${r}`);
          const start = Number(m[1]);
          const end = Number(m[2] || m[1]);
          return { start, end };
        });
        parts = await splitByRanges(buf, parsed);
      }
      setZipReady(parts.map((p) => ({ name: p.name, data: p.bytes })));
      toast.success(`Created ${parts.length} file(s)`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Split failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <div className="space-y-2">
              <Label>Mode</Label>
              <div className="flex gap-2">
                <Button size="sm" variant={mode === "ranges" ? "default" : "outline"} onClick={() => setMode("ranges")}>Ranges</Button>
                <Button size="sm" variant={mode === "every" ? "default" : "outline"} onClick={() => setMode("every")}>Every page</Button>
              </div>
            </div>
            {mode === "ranges" && (
              <div className="space-y-2">
                <Label htmlFor="ranges">Page ranges</Label>
                <Input id="ranges" value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3,5,7-9" />
                <p className="text-[11px] text-zinc-500">{pages ? `Document has ${pages} pages` : "Load a PDF first"}</p>
              </div>
            )}
            <Button className="w-full" onClick={run} disabled={!file || busy}>{busy ? "Splitting…" : "Split PDF"}</Button>
          </>
        }
      >
        <DropZone accept="application/pdf" onFiles={onFiles} label={file ? file.name : "Drop a PDF to split"} />
        {zipReady && (
          <ResultBar
            fileName={zipReady.length === 1 ? zipReady[0].name : "split-pages.zip"}
            size={zipReady.reduce((a, b) => a + b.data.byteLength, 0)}
            meta={`${zipReady.length} file(s)`}
            onDownload={() => {
              if (zipReady.length === 1) downloadBytes(zipReady[0].data, zipReady[0].name);
              else void downloadZip(zipReady, "split-pages.zip");
            }}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
