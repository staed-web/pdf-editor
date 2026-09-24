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
import { renderPdfPages } from "@/lib/pdf/ops";
import { downloadBytes, downloadZip, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";

const tool = getTool("pdf-to-jpg")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [scale, setScale] = useState(2);
  const [parts, setParts] = useState<{ name: string; data: Uint8Array }[] | null>(
    null
  );
  const job = useProcessJob();

  const onFiles = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f);
    setParts(null);
    job.resetError();
    setSummary(await inspectPdfFile(f));
  };

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setParts(null);
    job.resetError();
  };

  const run = async () => {
    if (!file) return;
    const pages = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Rendering pages…");
      setProgress(10);
      const out = await renderPdfPages(await file.arrayBuffer(), {
        format: "jpeg",
        scale,
        quality: 0.92,
      });
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      setProgress(90);
      return out;
    });
    if (!pages) return;
    setParts(pages.map((p) => ({ name: p.name, data: p.bytes })));
    toast.success(`Rendered ${pages.length} page(s)`);
  };

  const downloadName =
    parts && parts.length === 1
      ? parts[0].name
      : suggestedName(file?.name || "pages", "jpeg", "zip");

  return (
    <MarketingShell>
      <ToolShell
        actionBar={
          <ToolActionBar>
            <Button className="min-h-11 w-full" disabled={!file || job.busy} onClick={run}>
              {job.busy ? "Rendering…" : "Convert"}
            </Button>
          </ToolActionBar>
        }
        tool={tool}
        options={
          <>
            <div className="space-y-2">
              <Label>Resolution</Label>
              <div className="flex gap-2">
                {[1.5, 2, 3].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={scale === s ? "default" : "outline"}
                    onClick={() => setScale(s)}
                  >
                    {s}×
                  </Button>
                ))}
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
        />
        {parts && (
          <ProcessSuccess
            fileName={downloadName}
            fromTool="pdf-to-jpg"
            size={parts.reduce((a, b) => a + b.data.byteLength, 0)}
            meta={`${parts.length} image(s)`}
            onDownload={() => {
              if (parts.length === 1)
                downloadBytes(parts[0].data, parts[0].name, "image/jpeg");
              else void downloadZip(parts, downloadName);
            }}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
