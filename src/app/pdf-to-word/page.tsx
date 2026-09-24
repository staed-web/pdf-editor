"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { ToolActionBar } from "@/components/tools/ToolActionBar";
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
import { convertPdfToDocx, type PdfToDocxMode } from "@/lib/pdf/pdf-to-docx";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";

const tool = getTool("pdf-to-word")!;

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [result, setResult] = useState<{ name: string; bytes: Uint8Array } | null>(
    null
  );
  const [mode, setMode] = useState<PdfToDocxMode>("rich");
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
    const bytes = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Building Word document…");
      setProgress(5);
      const out = await convertPdfToDocx(await file.arrayBuffer(), {
        mode,
        pageBreaks: true,
        onProgress: (pct) => {
          if (!isCancelled()) setProgress(Math.max(5, pct));
        },
      });
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      return out;
    });
    if (!bytes) return;
    const name = suggestedName(file.name, mode === "rich" ? "rich" : "text", "docx");
    setResult({ name, bytes });
    toast.success(
      mode === "rich"
        ? "DOCX ready (layout + images for empty pages)"
        : "DOCX ready (fast text)"
    );
  };

  return (
    <MarketingShell>
      <ToolShell
        actionBar={
          <ToolActionBar>
            <Button className="min-h-11 w-full" disabled={!file || job.busy} onClick={run}>
              {job.busy ? "Converting…" : "Export DOCX"}
            </Button>
          </ToolActionBar>
        }
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Free local approximation: clusters text into lines/paragraphs, keeps
              bold/italic/size detection, and (Rich mode) embeds page JPEGs when a
              page has no extractable text. Not a perfect Word clone.
            </p>
            <div className="space-y-2">
              <Label>Quality mode</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={mode === "fast" ? "default" : "outline"}
                  onClick={() => setMode("fast")}
                >
                  Fast (text)
                </Button>
                <Button
                  size="sm"
                  variant={mode === "rich" ? "default" : "outline"}
                  onClick={() => setMode("rich")}
                >
                  Rich (layout + images)
                </Button>
              </div>
            </div>
            <SoftLimitsNote />
            
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={onFiles}
          label={file ? file.name : "Drop a PDF"}
        />
        <FileSummary summary={summary} />
        {job.busy && (
          <ProcessProgress
            value={job.progress}
            label={job.progressLabel}
            onCancel={job.cancel}
          />
        )}
        <ProcessError
          error={job.error}
          onDismiss={job.resetError}
          onRetry={() => void run()}
          onChooseFile={resetAll}
          showOcrLink={true}
        />
        {result && (
          <ProcessSuccess
            fileName={result.name}
            fromTool="pdf-to-word"
            size={result.bytes.byteLength}
            blob={result.bytes}
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onDownload={() =>
              downloadBytes(
                result.bytes,
                result.name,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              )
            }
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
