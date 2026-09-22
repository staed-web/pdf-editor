"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
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
import { compressPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { formatBytes } from "@/lib/utils";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";

const tool = getTool("compress")!;

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    originalSize: number;
    newSize: number;
    pageCount: number;
    jpegQuality: number;
    scaleUsed: number;
    name: string;
  } | null>(null);
  const job = useProcessJob();

  const onFiles = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f);
    setResult(null);
    job.resetError();
    setSummary(await inspectPdfFile(f));
  };

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setResult(null);
    job.resetError();
  };

  const run = async () => {
    if (!file) return;
    const out = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Compressing pages…");
      setProgress(15);
      await new Promise((r) => setTimeout(r, 30));
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      setProgress(40);
      const compressed = await compressPdf(await file.arrayBuffer(), quality);
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      return compressed;
    });
    if (!out) return;
    const name = suggestedName(file.name, "compressed");
    setResult({ ...out, name });
    const saved = out.originalSize - out.newSize;
    const pct = out.originalSize
      ? Math.round((saved / out.originalSize) * 100)
      : 0;
    toast.success(
      saved > 0
        ? `Saved ${formatBytes(saved)} (${pct}%)`
        : "Rebuilt (size similar — text-heavy PDFs compress less)"
    );
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Downsamples long edges and re-encodes pages as JPEG. Best for
              scans/photos; text-only files may not shrink much.
            </p>
            <div className="space-y-2">
              <Label>Quality</Label>
              <div className="flex flex-wrap gap-2">
                {(["low", "medium", "high"] as const).map((q) => (
                  <Button
                    key={q}
                    size="sm"
                    variant={quality === q ? "default" : "outline"}
                    onClick={() => setQuality(q)}
                    className="capitalize"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
            <SoftLimitsNote />
            <Button className="w-full" disabled={!file || job.busy} onClick={run}>
              {job.busy ? "Compressing…" : "Compress"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={onFiles}
          label={file ? file.name : "Drop a PDF to compress"}
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
        {result && (
          <ProcessSuccess
            fileName={result.name}
            size={result.newSize}
            meta={`${result.pageCount} pages · JPEG q=${result.jpegQuality}`}
            blob={result.bytes}
            beforeAfter={{ before: result.originalSize, after: result.newSize }}
            onDownload={() => downloadBytes(result.bytes, result.name)}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
