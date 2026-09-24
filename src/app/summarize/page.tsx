"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { ToolActionBar } from "@/components/tools/ToolActionBar";
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
  const [engineHint, setEngineHint] = useState({
    label: "Checking summary options…",
    detail:
      "Private · on your device. Browser AI when available; optional larger model stays off until you enable it.",
    browserSummarizer: null as boolean | null,
  });
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
        if (!cancelled) {
          setEngineHint({
            label: probe.label,
            detail: probe.detail,
            browserSummarizer: probe.browserSummarizer,
          });
        }
      } catch {
        if (!cancelled) {
          setEngineHint({
            label: "Quick outline · optional larger model",
            detail:
              "On-device browser AI isn’t available here. You’ll get a quick outline. An optional larger offline model (~230 MB) never starts unless you turn it on.",
            browserSummarizer: false,
          });
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
    const out = await job.run(async ({ signal, setProgress, setLabel, isCancelled }) => {
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
          badge: "Quick outline · private · on your device",
          bytes: new TextEncoder().encode(md),
          name: suggestedName(file.name, "outline", "md"),
          mime: "text/markdown",
        };
      }

      setLabel(
        allowXenova
          ? "Preparing optional offline summary…"
          : "Summarizing on your device…"
      );
      setProgress(8);
      const { summarizeOnDevice, summarizeMethodBadge } = await import(
        "@/lib/ai/summarize-ondevice"
      );
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");

      const resultSm = await summarizeOnDevice(text, {
        signal,
        allowXenova,
        onProgress: (pct, label) => {
          if (isCancelled()) return;
          setProgress(pct);
          setLabel(label);
        },
      });
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");

      const methodBadge = summarizeMethodBadge(resultSm.method);

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
          badge: methodBadge,
          bytes: new TextEncoder().encode(md),
          name: suggestedName(file.name, "summary", "md"),
          mime: "text/markdown",
        };
      }

      if (resultSm.method === "xenova-distilbart" && resultSm.summary) {
        const md = [
          `# PDF summary`,
          ``,
          `Summarized privately on your device (optional offline model).`,
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
          badge: methodBadge,
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
        badge: methodBadge,
        bytes: new TextEncoder().encode(md),
        name: suggestedName(file.name, "outline", "md"),
        mime: "text/markdown",
      };
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
        actionBar={
          <ToolActionBar>
            <Button
              className="min-h-11 w-full flex-1"
              disabled={!file || job.busy}
              onClick={run}
            >
              {job.busy
                ? "Working…"
                : fastOnly
                  ? "Extract & outline"
                  : "Summarize"}
            </Button>
          </ToolActionBar>
        }
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Summarize a PDF on your device. Nothing is uploaded. Outline mode
              is always available; optional deeper summary may download a larger
              on-device pack the first time you enable it — never automatic.
            </p>
            <div
              className={
                engineHint.browserSummarizer === false
                  ? "rounded-lg border border-sky-200/80 bg-sky-50 px-3 py-2 text-[11px] text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100"
                  : "rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
              }
            >
              <p className="font-medium">{engineHint.label}</p>
              <p className="mt-1 opacity-90">{engineHint.detail}</p>
            </div>
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
                  Optional offline model ({SUMMARIZE_MODEL_SIZE_LABEL})
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
                Downloads only after you turn this on and tap Summarize — never
                on page load. Large pack (~230 MB); may struggle on low-memory
                devices. Prefer leaving this off unless you need a richer
                summary.
              </p>
            )}
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
