"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const job = useProcessJob();

  const pages = summary?.pageCount ?? 0;

  const onFiles = useCallback(
    async (files: File[]) => {
      const f = files.find(isPdfFile);
      if (!f) return toast.error("PDF only");
      setFile(f);
      setResult(null);
      setRegions([]);
      job.resetError();
      setSummary(await inspectPdfFile(f));
    },
    [job.resetError]
  );

  useHandoffIntake("/redact", async (f) => {
    await onFiles([f]);
  });

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
              Coords are top-left page points. Prefer hard wipe for sensitive
              data — it burns regions into the page so underlying text is
              destroyed, not merely covered by a black box (best-effort, not
              cryptographic).
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
              onClick={() => {
                if (hardWipe) setConfirmOpen(true);
                else void run();
              }}
            >
              {job.busy ? "Working…" : "Apply redactions"}
            </Button>
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11px] leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <strong>Verify redaction:</strong> after download, open the PDF and
              try selecting or searching the covered text. With hard wipe it
              should be gone — a black box alone is not enough for sensitive data.
            </div>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Permanently remove content?</DialogTitle>
                  <DialogDescription>
                    Hard wipe burns black regions into the page image and destroys
                    the underlying text/images in those areas (best-effort raster
                    wipe — not cryptographic sanitization). Soft black boxes leave
                    text selectable underneath.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirmOpen(false);
                      void run();
                    }}
                  >
                    Yes, hard wipe permanently
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            fromTool="redact"
            onDownload={() => downloadBytes(result.bytes, result.name)}
            onProcessAnother={resetAll}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
