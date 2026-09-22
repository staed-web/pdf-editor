"use client";

import { useCallback, useState } from "react";
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
import { useHandoffIntake } from "@/hooks/useHandoffIntake";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";
import { DEFAULT_OCR_LANG, OCR_LANGS } from "@/lib/pdf/ocr-langs";
import { cn } from "@/lib/utils";

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
  const [lang, setLang] = useState(DEFAULT_OCR_LANG);
  const job = useProcessJob();

  const onFiles = useCallback(
    async (fs: File[]) => {
      const f = fs.find(isPdfFile);
      if (!f) return toast.error("PDF only");
      setFile(f);
      setText("");
      setResult(null);
      job.resetError();
      setSummary(await inspectPdfFile(f));
    },
    [job.resetError]
  );

  useHandoffIntake("/ocr", async (f) => {
    await onFiles([f]);
  });

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
        const { ocrToSearchablePdf } = await import("@/lib/pdf/ocr-searchable");
        const ocr = await ocrToSearchablePdf(await file.arrayBuffer(), {
          lang,
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
      const { ocrPagesToText } = await import("@/lib/pdf/ocr-searchable");
      const full = await ocrPagesToText(await file.arrayBuffer(), {
        lang,
        isCancelled,
        onProgress: (pct, label) => {
          if (isCancelled()) return;
          setProgress(pct);
          if (label) setLabel(label);
        },
      });
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
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

  const prominent = OCR_LANGS.filter((l) => l.prominent);
  const more = OCR_LANGS.filter((l) => !l.prominent);

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Runs Tesseract.js in your browser (loaded only when you OCR).
              Searchable mode embeds page images plus an invisible text layer
              from word boxes. Hindi (hin / eng+hin) lazy-loads a Devanagari
              font so Devanagari glyphs are actually searchable in the PDF —
              not image-only.
            </p>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="searchable">Searchable PDF output</Label>
              <Switch
                id="searchable"
                checked={searchable}
                onCheckedChange={setSearchable}
              />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <div className="flex flex-wrap gap-2">
                {prominent.map((l) => (
                  <Button
                    key={l.id}
                    type="button"
                    size="sm"
                    variant={lang === l.id ? "default" : "outline"}
                    className={cn(
                      "rounded-full",
                      l.prominent && lang !== l.id && "border-amber-300/80"
                    )}
                    onClick={() => setLang(l.id)}
                  >
                    {l.label}
                  </Button>
                ))}
              </div>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                value={more.some((m) => m.id === lang) ? lang : ""}
                onChange={(e) => {
                  if (e.target.value) setLang(e.target.value);
                }}
                aria-label="More OCR languages"
              >
                <option value="">More languages…</option>
                {more.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
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
            fromTool="ocr"
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
