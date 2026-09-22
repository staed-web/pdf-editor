"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { ocrToSearchablePdf } from "@/lib/pdf/ocr-searchable";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { createWorker } from "tesseract.js";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";

const tool = getTool("ocr")!;

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    name: string;
    mime: string;
  } | null>(null);
  const [searchable, setSearchable] = useState(true);
  const job = useProcessJob();

  const onFiles = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f);
    setText("");
    setResult(null);
    job.resetError();
    setSummary(await inspectPdfFile(f));
  };

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setText("");
    setResult(null);
    job.resetError();
  };

  const run = async () => {
    if (!file) return;
    const out = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("OCR in progress…");
      setProgress(5);
      if (searchable) {
        const ocr = await ocrToSearchablePdf(await file.arrayBuffer(), {
          onProgress: (pct, label) => {
            if (isCancelled()) return;
            setProgress(pct);
            if (label) setLabel(label);
          },
        });
        if (isCancelled()) throw new DOMException("Aborted", "AbortError");
        return {
          text: ocr.text,
          bytes: ocr.bytes,
          name: suggestedName(file.name, "ocr"),
          mime: "application/pdf",
        };
      }
      const pages = await renderPdfPages(await file.arrayBuffer(), {
        format: "png",
        scale: 2,
      });
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            if (!isCancelled()) {
              setProgress(10 + Math.round(m.progress * 80));
            }
          }
        },
      });
      const chunks: string[] = [];
      try {
        for (let i = 0; i < pages.length; i++) {
          if (isCancelled()) throw new DOMException("Aborted", "AbortError");
          setProgress(10 + Math.round((i / pages.length) * 80));
          setLabel(`OCR page ${i + 1} of ${pages.length}…`);
          const { data } = await worker.recognize(pages[i].blob);
          chunks.push(`--- Page ${i + 1} ---\n${data.text}`);
        }
      } finally {
        await worker.terminate();
      }
      const full = chunks.join("\n\n");
      return {
        text: full,
        bytes: new TextEncoder().encode(full),
        name: suggestedName(file.name, "ocr", "txt"),
        mime: "text/plain",
      };
    });
    if (!out) return;
    setText(out.text);
    setResult({ bytes: out.bytes, name: out.name, mime: out.mime });
    toast.success(searchable ? "Searchable OCR PDF ready" : "OCR complete");
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Runs Tesseract.js in your browser. Searchable mode embeds page
              images plus an invisible text layer from word boxes.
            </p>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="searchable">Searchable PDF output</Label>
              <Switch
                id="searchable"
                checked={searchable}
                onCheckedChange={setSearchable}
              />
            </div>
            <SoftLimitsNote />
            <Button className="w-full" disabled={!file || job.busy} onClick={run}>
              {job.busy
                ? "Recognizing…"
                : searchable
                  ? "Make searchable PDF"
                  : "Run OCR (text)"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={onFiles}
          label={file ? file.name : "Drop a scanned PDF"}
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
        {text && (
          <textarea
            className="min-h-48 w-full rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900"
            readOnly
            value={text}
          />
        )}
        {result && (
          <ProcessSuccess
            fileName={result.name}
            size={result.bytes.byteLength}
            blob={result.bytes}
            mime={result.mime}
            onDownload={() =>
              downloadBytes(result.bytes, result.name, result.mime)
            }
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
