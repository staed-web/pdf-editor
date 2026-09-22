"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { compressPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { formatBytes, cn } from "@/lib/utils";
import {
  inspectPdfFile,
  suggestedName,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";
import {
  COMPRESS_PRESETS,
  recommendCompressPreset,
  type CompressPresetId,
} from "@/lib/pdf/compress-presets";

const tool = getTool("compress")!;

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [preset, setPreset] = useState<CompressPresetId>("balanced");
  const [userPicked, setUserPicked] = useState(false);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    originalSize: number;
    newSize: number;
    pageCount: number;
    jpegQuality: number;
    scaleUsed: number;
    presetId: string;
    linearized: boolean;
    name: string;
  } | null>(null);
  const job = useProcessJob();

  const recommendation = useMemo(() => {
    if (!file) return null;
    return recommendCompressPreset({
      sizeBytes: file.size,
      pageCount: summary?.pageCount ?? null,
    });
  }, [file, summary?.pageCount]);

  useEffect(() => {
    if (!recommendation || userPicked) return;
    setPreset(recommendation.id);
  }, [recommendation, userPicked]);

  const onFiles = useCallback(
    async (fs: File[]) => {
      const f = fs.find(isPdfFile);
      if (!f) return toast.error("PDF only");
      setFile(f);
      setResult(null);
      setUserPicked(false);
      job.resetError();
      setSummary(await inspectPdfFile(f));
    },
    [job.resetError]
  );

  useHandoffIntake("/compress", async (f) => {
    await onFiles([f]);
  });

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setResult(null);
    setUserPicked(false);
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
      const compressed = await compressPdf(await file.arrayBuffer(), preset);
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

  const presetMeta = COMPRESS_PRESETS.find((p) => p.id === preset)!;

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Downsamples long edges and re-encodes pages as JPEG. Best for
              scans/photos; text-only files may not shrink much. Web presets also
              rewrite structure (best-effort — not Acrobat Fast Web View).
            </p>
            <div className="space-y-2">
              <Label>Optimizer preset</Label>
              <div className="flex flex-col gap-1.5">
                {COMPRESS_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPreset(p.id);
                      setUserPicked(true);
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm transition",
                      preset === p.id
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-[var(--hairline)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        {p.short}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                      {p.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {recommendation && (
              <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-[11px] leading-relaxed text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
                <strong>Tip:</strong>{" "}
                {COMPRESS_PRESETS.find((p) => p.id === recommendation.id)?.label}{" "}
                — {recommendation.reason}
                {recommendation.id !== preset && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-8 w-full"
                    onClick={() => {
                      setPreset(recommendation.id);
                      setUserPicked(true);
                    }}
                  >
                    Use suggested preset
                  </Button>
                )}
              </div>
            )}
            <p className="text-[11px] text-[var(--muted)]">
              Active: JPEG q={presetMeta.q} · max edge {presetMeta.maxEdge}px
              {presetMeta.linearize ? " · structure rewrite" : ""}
            </p>
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
            meta={`${result.pageCount} pages · ${result.presetId} · JPEG q=${result.jpegQuality}${
              result.linearized ? " · linearized" : ""
            }`}
            blob={result.bytes}
            beforeAfter={{ before: result.originalSize, after: result.newSize }}
            fromTool="compress"
            onDownload={() => downloadBytes(result.bytes, result.name)}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
