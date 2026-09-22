"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { redactRegions } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  inspectPdfFile,
  suggestedName,
  classifyProcessError,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";

const tool = getTool("redact")!;

export default function RedactPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [page, setPage] = useState(1);
  const [x, setX] = useState(72);
  const [y, setY] = useState(72);
  const [w, setW] = useState(200);
  const [h, setH] = useState(40);
  const [regions, setRegions] = useState<
    { pageIndex: number; x: number; y: number; w: number; h: number }[]
  >([]);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(
    null
  );
  const [hardWipe, setHardWipe] = useState(true);
  const job = useProcessJob();

  const pages = summary?.pageCount ?? 0;

  const onFiles = async (files: File[]) => {
    const f = files.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f);
    setResult(null);
    setRegions([]);
    job.resetError();
    setSummary(await inspectPdfFile(f));
  };

  const resetAll = () => {
    setFile(null);
    setSummary(null);
    setRegions([]);
    setResult(null);
    job.resetError();
  };

  const run = async () => {
    if (!file) return;
    if (!regions.length) {
      job.setError(
        classifyProcessError(new Error("Add at least one region to redact"))
      );
      return;
    }
    const bytes = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel(hardWipe ? "Hard wipe redaction…" : "Applying redactions…");
      setProgress(25);
      const out = await redactRegions(await file.arrayBuffer(), regions, {
        hardWipe,
      });
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      setProgress(90);
      return out;
    });
    if (!bytes) return;
    const name = suggestedName(file.name, "redacted");
    setResult({ bytes, name });
    toast.success(
      hardWipe
        ? "Redacted with hard wipe (affected pages rasterized)"
        : "Redacted (visual black boxes)"
    );
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Coords are top-left page points. Hard wipe re-renders pages with
              black boxes burned in so underlying text/images in those regions
              are removed (best-effort, not cryptographic).
            </p>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="wipe">Hard wipe (rasterize)</Label>
              <Switch id="wipe" checked={hardWipe} onCheckedChange={setHardWipe} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Page</Label>
                <Input
                  type="number"
                  min={1}
                  max={pages || 1}
                  value={page}
                  onChange={(e) => setPage(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>X</Label>
                <Input
                  type="number"
                  value={x}
                  onChange={(e) => setX(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Y</Label>
                <Input
                  type="number"
                  value={y}
                  onChange={(e) => setY(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>W</Label>
                <Input
                  type="number"
                  value={w}
                  onChange={(e) => setW(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>H</Label>
                <Input
                  type="number"
                  value={h}
                  onChange={(e) => setH(Number(e.target.value) || 1)}
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setRegions((r) => [...r, { pageIndex: page - 1, x, y, w, h }]);
                toast.message("Region queued");
              }}
            >
              Add region
            </Button>
            <p className="text-[11px] text-zinc-500">
              {regions.length} region(s) · {pages ? pages + " pages" : "no file"}
            </p>
            <SoftLimitsNote />
            <Button
              className="w-full"
              disabled={!file || job.busy || !regions.length}
              onClick={run}
            >
              {job.busy ? "Working…" : "Apply redactions"}
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <a href="/edit">Open full editor</a>
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
        {result && (
          <ProcessSuccess
            fileName={result.name}
            size={result.bytes.byteLength}
            blob={result.bytes}
            onDownload={() => downloadBytes(result.bytes, result.name)}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
