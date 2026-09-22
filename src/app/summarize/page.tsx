"use client";

import { useCallback, useEffect, useState } from "react";
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
import { extractTextFromPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";
import {
  SUMMARIZE_MODEL_SIZE_LABEL,
  localOutline,
} from "@/lib/ai/summarize-ondevice";

const tool = getTool("summarize")!;

export default function SummarizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  /** Prefer heuristic only — skip browser AI. */
  const [fastOnly, setFastOnly] = useState(false);
  /** Opt-in DistilBART — off by default to avoid OOM. */
  const [allowXenova, setAllowXenova] = useState(false);
  const [outline, setOutline] = useState<string[]>([]);
  const [summaryText, setSummaryText] = useState("");
  const [badge, setBadge] = useState("");
  const [engineHint, setEngineHint] = useState(
    "Checking summary options…"
  );
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    name: string;
    mime: string;
  } | null>(null);
  const job = useProcessJob();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { probeSummarizeEngine } = await import(
          "@/lib/ai/summarize-ondevice"
        );
        const probe = await probeSummarizeEngine();
        if (!cancelled) setEngineHint(probe.label);
      } catch {
        if (!cancelled) {
          setEngineHint("Private · on your device");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onFiles = useCallback(
    async (fs: File[]) => {
      const f = fs.find(isPdfFile);
      if (!f) return toast.error("PDF only");
      setFile(f);
      setOutline([]);
      setSummaryText("");
      setBadge("");
      setResult(null);
      job.resetError();
      setSummary(await inspectPdfFile(f));
    },
    [job.resetError]
  );

  useHandoffIntake("/summarize", async (f) => {
    await onFiles([f]);
  });

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setOutline([]);
    setSummaryText("");
    setBadge("");
    setResult(null);
    job.resetError();
  };

  const run = async () => {
    if (!file) return;
    const out = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Extracting text…");
      setProgress(5);
      const pages = await extractTextFromPdf(await file.arrayBuffer());
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      const text = pages.map((p) => p.text).join("\n");
      if (!text.trim()) {
        throw new Error(
          "Little or no extractable text. Try OCR first if this is a scan."
        );
      }

      const bullets = localOutline(text);

      if (fastOnly) {
        setLabel("Building outline…");
        setProgress(60);
        const md = [
          `# PDF outline`,
          ``,
          `Key sentences extracted on your device.`,
          ``,
          ...bullets.map((b) => `- ${b}`),
          ``,
          `---`,
          ``,
          `# Extracted text`,
          ``,
          text.slice(0, 100000),
        ].join("\n");
        setProgress(100);
        return {
          outline: bullets,
          summaryText: "",
          badge: "Private · on your device",
          bytes: new TextEncoder().encode(md),
          name: suggestedName(file.name, "outline", "md"),
          mime: "text/markdown",
        };
      }

      setLabel("Summarizing…");
      setProgress(8);
      const { summarizeOnDevice } = await import("@/lib/ai/summarize-ondevice");
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");

      const ac = new AbortController();
      const poll = setInterval(() => {
        if (isCancelled()) ac.abort();
      }, 200);

      try {
        const resultSm = await summarizeOnDevice(text, {
          signal: ac.signal,
          allowXenova,
          onProgress: (pct, label) => {
            if (isCancelled()) {
              ac.abort();
              return;
            }
            setProgress(pct);
            setLabel(label);
          },
        });
        if (isCancelled()) throw new DOMException("Aborted", "AbortError");

        if (resultSm.method === "browser-summarizer" && resultSm.summary) {
          const md = [
            `# PDF summary`,
            ``,
            `Summarized privately on your device.`,
            ``,
            resultSm.summary,
            ``,
            `---`,
            ``,
            `# Outline`,
            ``,
            ...bullets.map((b) => `- ${b}`),
            ``,
            `---`,
            ``,
            `# Extracted text (truncated)`,
            ``,
            text.slice(0, 50000),
          ].join("\n");
          return {
            outline: bullets,
            summaryText: resultSm.summary,
            badge: "Private · on your device",
            bytes: new TextEncoder().encode(md),
            name: suggestedName(file.name, "summary", "md"),
            mime: "text/markdown",
          };
        }

        if (resultSm.method === "xenova-distilbart" && resultSm.summary) {
          const md = [
            `# PDF summary`,
            ``,
            `Summarized privately on your device.`,
            ``,
            resultSm.summary,
            ``,
            `---`,
            ``,
            `# Outline`,
            ``,
            ...bullets.map((b) => `- ${b}`),
            ``,
            `---`,
            ``,
            `# Extracted text (truncated)`,
            ``,
            text.slice(0, 50000),
          ].join("\n");
          return {
            outline: bullets,
            summaryText: resultSm.summary,
            badge: "Private · on your device",
            bytes: new TextEncoder().encode(md),
            name: suggestedName(file.name, "summary", "md"),
            mime: "text/markdown",
          };
        }

        // Default honest fallback — no Xenova auto-download
        const md = [
          `# PDF outline`,
          ``,
          `Key sentences extracted on your device.`,
          ``,
          ...bullets.map((b) => `- ${b}`),
          ``,
          `---`,
          ``,
          `# Extracted text`,
          ``,
          text.slice(0, 100000),
        ].join("\n");
        return {
          outline: bullets,
          summaryText: "",
          badge: "Private · on your device",
          bytes: new TextEncoder().encode(md),
          name: suggestedName(file.name, "outline", "md"),
          mime: "text/markdown",
        };
      } finally {
        clearInterval(poll);
      }
    });

    if (!out) return;
    setOutline(out.outline);
    setSummaryText(out.summaryText);
    setBadge(out.badge);
    setResult({ bytes: out.bytes, name: out.name, mime: out.mime });
    toast.success(out.summaryText ? "Summary ready" : "Outline ready");
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Summarize a PDF on your device. Nothing is uploaded. Outline mode
              is always available; optional deeper summary may download a larger
              on-device pack the first time you enable it.
            </p>
            <p className="rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
              {engineHint}
            </p>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="fast-outline">
                Quick outline only
              </Label>
              <Switch
                id="fast-outline"
                checked={fastOnly}
                onCheckedChange={(v) => {
                  setFastOnly(v);
                  if (v) setAllowXenova(false);
                }}
              />
            </div>
            {!fastOnly && (
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="allow-xenova">
                  Optional deeper summary ({SUMMARIZE_MODEL_SIZE_LABEL} download)
                </Label>
                <Switch
                  id="allow-xenova"
                  checked={allowXenova}
                  onCheckedChange={setAllowXenova}
                />
              </div>
            )}
            {allowXenova && !fastOnly && (
              <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                Large download — may struggle on low-memory devices. Prefer
                leaving this off unless you need a richer summary.
              </p>
            )}
            <SoftLimitsNote />
            <Button
              className="w-full"
              disabled={!file || job.busy}
              onClick={run}
            >
              {job.busy
                ? "Working…"
                : fastOnly
                  ? "Extract & outline"
                  : "Summarize"}
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
        {summaryText && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Summary
            </p>
            <p className="whitespace-pre-wrap">{summaryText}</p>
          </div>
        )}
        {outline.length > 0 && (
          <ul className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <li className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {summaryText ? "Extractive outline (bonus)" : "Outline"}
            </li>
            {outline.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-600">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {result && (
          <ProcessSuccess
            fileName={result.name}
            size={result.bytes.byteLength}
            mime={result.mime}
            blob={result.bytes}
            meta={badge || undefined}
            fromTool="summarize"
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
