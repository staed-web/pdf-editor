"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSummary,
  ProcessProgress,
  ProcessError,
  ProcessSuccess,
  SoftLimitsNote,
} from "@/components/tools/process";
import { getTool } from "@/lib/tools";
import { useProcessJob } from "@/hooks/useProcessJob";
import { splitByRanges, splitEveryPage } from "@/lib/pdf/ops";
import { downloadBytes, downloadZip, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";

const tool = getTool("split")!;

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [mode, setMode] = useState<"ranges" | "every">("ranges");
  const [ranges, setRanges] = useState("");
  const [zipReady, setZipReady] = useState<
    { name: string; data: Uint8Array }[] | null
  >(null);
  const job = useProcessJob();

  const onFiles = async (files: File[]) => {
    const f = files.find(isPdfFile);
    if (!f) {
      toast.error("Please drop a PDF");
      return;
    }
    setFile(f);
    setZipReady(null);
    job.resetError();
    const s = await inspectPdfFile(f);
    setSummary(s);
    if (s.pageCount) setRanges(`1-${s.pageCount}`);
  };

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setZipReady(null);
    setRanges("");
    job.resetError();
  };

  const run = async () => {
    if (!file) return;
    const parts = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Splitting…");
      setProgress(20);
      const buf = await file.arrayBuffer();
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      let out: { name: string; bytes: Uint8Array }[];
      if (mode === "every") {
        out = await splitEveryPage(buf);
      } else {
        const parsed = ranges
          .split(/[,\s]+/)
          .filter(Boolean)
          .map((r) => {
            const m = r.match(/^(\d+)(?:-(\d+))?$/);
            if (!m) throw new Error(`Invalid page range: ${r}`);
            const start = Number(m[1]);
            const end = Number(m[2] || m[1]);
            return { start, end };
          });
        if (!parsed.length) throw new Error("Enter at least one page range");
        out = await splitByRanges(buf, parsed);
      }
      setProgress(90);
      return out;
    });
    if (!parts) return;
    setZipReady(parts.map((p) => ({ name: p.name, data: p.bytes })));
    toast.success(`Created ${parts.length} file(s)`);
  };

  const downloadName =
    zipReady && zipReady.length === 1
      ? zipReady[0].name
      : suggestedName(file?.name || "split", "pages", "zip");

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <div className="space-y-2">
              <Label>Mode</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={mode === "ranges" ? "default" : "outline"}
                  onClick={() => setMode("ranges")}
                >
                  Ranges
                </Button>
                <Button
                  size="sm"
                  variant={mode === "every" ? "default" : "outline"}
                  onClick={() => setMode("every")}
                >
                  Every page
                </Button>
              </div>
            </div>
            {mode === "ranges" && (
              <div className="space-y-2">
                <Label htmlFor="ranges">Page ranges</Label>
                <Input
                  id="ranges"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  placeholder="1-3, 5"
                />
                <p className="text-[11px] text-zinc-500">
                  {summary?.pageCount
                    ? `Document has ${summary.pageCount} pages`
                    : "Load a PDF first"}
                </p>
              </div>
            )}
            <SoftLimitsNote />
            <Button className="w-full" onClick={run} disabled={!file || job.busy}>
              {job.busy ? "Splitting…" : "Split PDF"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={onFiles}
          label={file ? file.name : "Drop a PDF to split"}
        />
        <FileSummary summary={summary} />
        {job.busy && (
          <ProcessProgress
            value={job.progress}
            label={job.progressLabel}
            onCancel={job.cancel}
          />
        )}
        <ProcessError error={job.error} onDismiss={job.resetError} />
        {zipReady && (
          <ProcessSuccess
            fileName={downloadName}
            size={zipReady.reduce((a, b) => a + b.data.byteLength, 0)}
            meta={`${zipReady.length} file(s)`}
            onDownload={() => {
              if (zipReady.length === 1)
                downloadBytes(zipReady[0].data, zipReady[0].name);
              else void downloadZip(zipReady, downloadName);
            }}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
