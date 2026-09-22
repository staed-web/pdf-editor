"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, EyeOff } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  inspectPdfFile,
  suggestedName,
  classifyProcessError,
  type PdfFileSummary,
} from "@/lib/pdf/process-ux";
import {
  REDACT_PATTERNS,
  findRedactPatterns,
  type PatternHit,
  type RedactPatternId,
} from "@/lib/pdf/redact-patterns";

const tool = getTool("redact")!;

type Region = { pageIndex: number; x: number; y: number; w: number; h: number };

export default function RedactPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<PdfFileSummary | null>(null);
  const [page, setPage] = useState(1);
  const [x, setX] = useState(72);
  const [y, setY] = useState(72);
  const [w, setW] = useState(200);
  const [h, setH] = useState(40);
  const [regions, setRegions] = useState<Region[]>([]);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(
    null
  );
  const [hardWipe, setHardWipe] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [patternIds, setPatternIds] = useState<RedactPatternId[]>([
    "email",
    "phone",
    "aadhaar",
    "pan",
    "credit-card",
  ]);
  const [hits, setHits] = useState<PatternHit[]>([]);
  const [selectedHitIds, setSelectedHitIds] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const job = useProcessJob();

  const pages = summary?.pageCount ?? 0;

  const onFiles = useCallback(
    async (files: File[]) => {
      const f = files.find(isPdfFile);
      if (!f) return toast.error("PDF only");
      setFile(f);
      setResult(null);
      setRegions([]);
      setHits([]);
      setSelectedHitIds(new Set());
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
    setHits([]);
    setSelectedHitIds(new Set());
    setResult(null);
    job.resetError();
  };

  const togglePattern = (id: RedactPatternId) => {
    setPatternIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const scanPatterns = async () => {
    if (!file) return;
    if (!patternIds.length) {
      toast.error("Pick at least one pattern");
      return;
    }
    setScanning(true);
    job.resetError();
    try {
      const found = await findRedactPatterns(
        await file.arrayBuffer(),
        patternIds
      );
      setHits(found);
      setSelectedHitIds(new Set(found.map((h) => h.id)));
      toast.success(
        found.length
          ? `Found ${found.length} match(es) — review before wipe`
          : "No matches for selected patterns"
      );
    } catch (e) {
      job.setError(classifyProcessError(e));
    } finally {
      setScanning(false);
    }
  };

  const selectedHits = useMemo(
    () => hits.filter((h) => selectedHitIds.has(h.id)),
    [hits, selectedHitIds]
  );

  const allRegions: Region[] = useMemo(() => {
    const fromHits = selectedHits.map((h) => ({
      pageIndex: h.pageIndex,
      x: h.x,
      y: h.y,
      w: h.w,
      h: h.h,
    }));
    return [...regions, ...fromHits];
  }, [regions, selectedHits]);

  const run = async () => {
    if (!file) return;
    if (!allRegions.length) {
      job.setError(
        classifyProcessError(
          new Error("Add a region or select pattern matches to redact")
        )
      );
      return;
    }
    const bytes = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel(hardWipe ? "Hard wipe redaction…" : "Applying redactions…");
      setProgress(25);
      const out = await redactRegions(await file.arrayBuffer(), allRegions, {
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

            <div className="space-y-2 rounded-xl border border-[var(--hairline)] p-3">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-amber-600" />
                <Label className="text-sm">Smart patterns</Label>
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Find &amp; preview emails, phones, Aadhaar-like 12-digit groups,
                PAN-like IDs, and Luhn-valid card numbers — then wipe selected
                hits.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {REDACT_PATTERNS.map((p) => {
                  const on = patternIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.hint}
                      onClick={() => togglePattern(p.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                        on
                          ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                          : "border-[var(--hairline)] text-[var(--muted)]"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={!file || scanning || job.busy}
                onClick={() => void scanPatterns()}
              >
                {scanning ? "Scanning…" : "Find matches"}
              </Button>
              {hits.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--hairline)] p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium">
                      Preview · {selectedHits.length}/{hits.length} selected
                    </span>
                    <button
                      type="button"
                      className="text-[10px] underline"
                      onClick={() => {
                        if (selectedHitIds.size === hits.length) {
                          setSelectedHitIds(new Set());
                        } else {
                          setSelectedHitIds(new Set(hits.map((h) => h.id)));
                        }
                      }}
                    >
                      {selectedHitIds.size === hits.length
                        ? "Deselect all"
                        : "Select all"}
                    </button>
                  </div>
                  {hits.map((hit) => {
                    const on = selectedHitIds.has(hit.id);
                    return (
                      <label
                        key={hit.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-[11px]",
                          on ? "bg-amber-500/10" : "opacity-70"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={on}
                          onChange={() => {
                            setSelectedHitIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(hit.id)) next.delete(hit.id);
                              else next.add(hit.id);
                              return next;
                            });
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{hit.label}</span>
                          <span className="text-[var(--muted)]">
                            {" "}
                            · p{hit.pageIndex + 1}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[10px]">
                            {hit.text}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
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
              {regions.length} manual · {selectedHits.length} pattern ·{" "}
              {allRegions.length} total
              {pages ? ` · ${pages} pages` : " · no file"}
            </p>
            <SoftLimitsNote />
            <Button
              className="w-full"
              disabled={!file || job.busy || !allRegions.length}
              onClick={() => {
                if (hardWipe) setConfirmOpen(true);
                else void run();
              }}
            >
              <EyeOff className="h-4 w-4" />
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
                    {selectedHits.length
                      ? ` About to wipe ${selectedHits.length} pattern match(es) plus ${regions.length} manual region(s).`
                      : ""}
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
