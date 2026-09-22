"use client";

import { useCallback, useMemo, useState } from "react";
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
import { useHandoffIntake } from "@/hooks/useHandoffIntake";
import { extractTextFromPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";
import {
  MARIAN_MODELS,
  TRANSLATE_LANGS,
  resolveMarianPair,
} from "@/lib/ai/translate-ondevice";

const tool = getTool("translate")!;

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [targetLang, setTargetLang] = useState("hi");
  const [sourceLang, setSourceLang] = useState("en");
  const [method, setMethod] = useState("");
  const [modelId, setModelId] = useState<string | undefined>();
  const [preview, setPreview] = useState("");
  const [txtResult, setTxtResult] = useState<{
    bytes: Uint8Array;
    name: string;
  } | null>(null);
  const [pdfResult, setPdfResult] = useState<{
    bytes: Uint8Array;
    name: string;
  } | null>(null);
  const job = useProcessJob();

  const pairInfo = useMemo(() => {
    const pair = resolveMarianPair(sourceLang, targetLang);
    if (!pair) return null;
    return MARIAN_MODELS[pair.key];
  }, [sourceLang, targetLang]);

  const onFiles = useCallback(
    async (fs: File[]) => {
      const f = fs.find(isPdfFile);
      if (!f) return toast.error("PDF only");
      setFile(f);
      setMethod("");
      setModelId(undefined);
      setPreview("");
      setTxtResult(null);
      setPdfResult(null);
      job.resetError();
      setSummary(await inspectPdfFile(f));
    },
    [job.resetError]
  );

  useHandoffIntake("/translate", async (f) => {
    await onFiles([f]);
  });

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setMethod("");
    setModelId(undefined);
    setPreview("");
    setTxtResult(null);
    setPdfResult(null);
    job.resetError();
  };

  const onTargetChange = (id: string) => {
    setTargetLang(id);
    const lang = TRANSLATE_LANGS.find((l) => l.id === id);
    if (lang && "sourceHint" in lang && lang.sourceHint) {
      setSourceLang(lang.sourceHint);
    } else {
      setSourceLang("en");
    }
  };

  const run = async () => {
    if (!file) return;
    const out = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Extracting text…");
      setProgress(4);
      const pages = await extractTextFromPdf(await file.arrayBuffer());
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      const src = pages.map((p) => `## Page ${p.page}\n\n${p.text}`).join("\n\n");
      if (!src.replace(/#+\s*Page\s+\d+/g, "").trim()) {
        throw new Error(
          "Little or no extractable text. Try OCR first if this is a scan."
        );
      }

      setLabel("Starting translation…");
      setProgress(6);
      const { translateOnDevice } = await import("@/lib/ai/translate-ondevice");
      const ac = new AbortController();
      const poll = setInterval(() => {
        if (isCancelled()) ac.abort();
      }, 200);

      let translated;
      try {
        translated = await translateOnDevice(src, {
          sourceLang,
          targetLang,
          signal: ac.signal,
          onProgress: (pct, label) => {
            if (isCancelled()) {
              ac.abort();
              return;
            }
            setProgress(Math.min(88, pct));
            setLabel(label);
          },
        });
      } finally {
        clearInterval(poll);
      }
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");

      const bilingual = [
        `# Source (${sourceLang})`,
        ``,
        src.slice(0, 100000),
        ``,
        `---`,
        ``,
        `# Translation (${targetLang}) via ${translated.method}${
          translated.modelId ? ` · ${translated.modelId}` : ""
        }`,
        ``,
        translated.text,
      ].join("\n");

      setLabel("Building bilingual TXT…");
      setProgress(92);
      const txtBytes = new TextEncoder().encode(bilingual);

      let pdfBytes: Uint8Array | null = null;
      try {
        setLabel("Best-effort bilingual PDF…");
        setProgress(95);
        const { bilingualTextToPdf } = await import("@/lib/ai/text-pdf");
        pdfBytes = await bilingualTextToPdf(src.slice(0, 40000), translated.text.slice(0, 40000), {
          sourceLabel: sourceLang,
          targetLabel: targetLang,
          method: translated.method,
        });
      } catch {
        /* PDF text layer is best-effort */
      }

      setProgress(100);
      return {
        method: translated.method,
        modelId: translated.modelId,
        preview: translated.text.slice(0, 4000),
        txtBytes,
        txtName: suggestedName(file.name, "translation", "txt"),
        pdfBytes,
        pdfName: suggestedName(file.name, "translation", "pdf"),
      };
    });

    if (!out) return;
    setMethod(out.method);
    setModelId(out.modelId);
    setPreview(out.preview);
    setTxtResult({ bytes: out.txtBytes, name: out.txtName });
    setPdfResult(
      out.pdfBytes ? { bytes: out.pdfBytes, name: out.pdfName } : null
    );
    toast.success(`Translated via ${out.method}`);
  };

  const badge =
    method === "Browser Translator API"
      ? "Browser Translator API"
      : method === "On-device Marian MT"
        ? `On-device model${modelId ? ` · ${modelId}` : ""}`
        : method === "Offline glossary (not real MT)"
          ? "Rules / heuristic · offline glossary (not real MT)"
          : "";

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Priority: (1) Chrome Translator API when available, (2) on-device
              Marian MT via transformers.js (EN↔HI prioritized), (3) offline
              Rules / heuristic glossary stub labeled as not real MT. PDF text never uploaded.
              Models lazy-load only on this route.
            </p>
            <div className="space-y-2">
              <Label>Target language</Label>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                value={targetLang}
                onChange={(e) => onTargetChange(e.target.value)}
              >
                {TRANSLATE_LANGS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Source language</Label>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
            {pairInfo ? (
              <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                Fallback model if browser API missing:{" "}
                <code className="text-[10px]">{pairInfo.modelId}</code> (
                {pairInfo.sizeLabel} first download, then cached). Progress +
                cancel shown during download/inference.
              </p>
            ) : (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                No Marian pair for {sourceLang}→{targetLang}. Will use Browser
                Translator API if present, otherwise{" "}
                <strong>Rules / heuristic offline glossary (not real MT)</strong>.
              </p>
            )}
            <SoftLimitsNote />
            <Button
              className="w-full"
              disabled={!file || job.busy}
              onClick={run}
            >
              {job.busy ? "Working…" : "Translate"}
            </Button>
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
        <ProcessError error={job.error} onDismiss={job.resetError} />
        {badge && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {badge}
          </p>
        )}
        {preview && (
          <pre className="max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white p-3 text-xs whitespace-pre-wrap dark:border-zinc-800 dark:bg-zinc-900">
            {preview}
          </pre>
        )}
        {txtResult && (
          <ProcessSuccess
            fileName={txtResult.name}
            size={txtResult.bytes.byteLength}
            mime="text/plain"
            blob={txtResult.bytes}
            meta={badge || method}
            fromTool="translate"
            onDownload={() =>
              downloadBytes(txtResult.bytes, txtResult.name, "text/plain")
            }
            onProcessAnother={resetAll}
          />
        )}
        {pdfResult && (
          <ProcessSuccess
            fileName={pdfResult.name}
            size={pdfResult.bytes.byteLength}
            mime="application/pdf"
            blob={pdfResult.bytes}
            meta="Best-effort bilingual text PDF (not layout-preserving)"
            fromTool="translate"
            onDownload={() =>
              downloadBytes(
                pdfResult.bytes,
                pdfResult.name,
                "application/pdf"
              )
            }
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
