"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { SoftLimitsNote } from "@/components/tools/process";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { useToolFiles } from "@/hooks/useToolFiles";
import {
  compressPdf,
  unlockPdf,
  protectPdf,
  addWatermark,
  rotatePages,
  renderPdfPages,
} from "@/lib/pdf/ops";
import { downloadZip, isPdfFile } from "@/lib/download";
import { formatBytes, cn } from "@/lib/utils";
import {
  SOFT_LIMITS,
  classifyProcessError,
  suggestedName,
} from "@/lib/pdf/process-ux";
import { DEFAULT_OCR_LANG, OCR_LANGS } from "@/lib/pdf/ocr-langs";

const tool = getTool("batch")!;

type BatchOp =
  | "compress"
  | "ocr"
  | "pdf-to-jpg"
  | "unlock"
  | "watermark"
  | "protect"
  | "rotate";

type ItemStatus = "queued" | "running" | "done" | "error" | "skipped";

type BatchItem = {
  id: string;
  status: ItemStatus;
  error?: string;
  outputs?: { name: string; data: Uint8Array }[];
};

const OPS: {
  id: BatchOp;
  label: string;
  hint: string;
  needsPassword?: boolean;
  needsText?: boolean;
}[] = [
  { id: "compress", label: "Compress", hint: "Downsample pages (medium quality)" },
  { id: "ocr", label: "OCR (searchable)", hint: "Slow — runs on your device" },
  { id: "pdf-to-jpg", label: "PDF → JPG", hint: "One ZIP of images per file" },
  { id: "unlock", label: "Unlock", hint: "Same password for all files", needsPassword: true },
  { id: "watermark", label: "Watermark", hint: "Same text on every file", needsText: true },
  { id: "protect", label: "Protect", hint: "Encrypt with one password", needsPassword: true },
  { id: "rotate", label: "Rotate 90°", hint: "Rotate all pages clockwise" },
];

export default function BatchPage() {
  const { files, addFiles, remove, clear } = useToolFiles();
  const [op, setOp] = useState<BatchOp>("compress");
  const [password, setPassword] = useState("");
  const [wmText, setWmText] = useState("CONFIDENTIAL");
  const [ocrLang, setOcrLang] = useState(DEFAULT_OCR_LANG);
  const [items, setItems] = useState<Record<string, BatchItem>>({});
  const [busy, setBusy] = useState(false);
  const [overall, setOverall] = useState(0);
  const cancelRef = useRef(false);

  const totalBytes = useMemo(
    () => files.reduce((a, f) => a + f.size, 0),
    [files]
  );

  const limitMessages = useMemo(() => {
    const msgs: string[] = [];
    if (files.length > SOFT_LIMITS.batchMaxFiles) {
      msgs.push(
        `Soft limit ${SOFT_LIMITS.batchMaxFiles} files — extra files will be skipped.`
      );
    }
    if (totalBytes > SOFT_LIMITS.batchMaxTotalBytes) {
      msgs.push(
        `Total size ${formatBytes(totalBytes)} exceeds soft limit ~${SOFT_LIMITS.batchMaxTotalBytes / (1024 * 1024)} MB.`
      );
    }
    return msgs;
  }, [files.length, totalBytes]);

  const opMeta = OPS.find((o) => o.id === op)!;

  useEffect(() => {
    setItems((prev) => {
      const next: Record<string, BatchItem> = {};
      for (const f of files) {
        next[f.id] = prev[f.id] ?? { id: f.id, status: "queued" };
      }
      return next;
    });
  }, [files]);

  const updateItem = (id: string, patch: Partial<BatchItem>) => {
    setItems((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { id, status: "queued" }), ...patch },
    }));
  };

  const processOne = async (
    file: File
  ): Promise<{ name: string; data: Uint8Array }[]> => {
    const buf = await file.arrayBuffer();
    switch (op) {
      case "compress": {
        const out = await compressPdf(buf, "medium");
        return [{ name: suggestedName(file.name, "compressed"), data: out.bytes }];
      }
      case "ocr": {
        const { ocrToSearchablePdf } = await import("@/lib/pdf/ocr-searchable");
        const out = await ocrToSearchablePdf(buf, { lang: ocrLang });
        return [{ name: suggestedName(file.name, "ocr"), data: out.bytes }];
      }
      case "pdf-to-jpg": {
        const pages = await renderPdfPages(buf, {
          format: "jpeg",
          scale: 2,
          quality: 0.9,
        });
        const base = file.name.replace(/\.pdf$/i, "") || "pages";
        return pages.map((p, i) => ({
          name: `${base}/page-${String(i + 1).padStart(3, "0")}.jpg`,
          data: p.bytes,
        }));
      }
      case "unlock": {
        const bytes = await unlockPdf(buf, password);
        return [{ name: suggestedName(file.name, "unlocked"), data: bytes }];
      }
      case "protect": {
        const bytes = await protectPdf(buf, password);
        return [{ name: suggestedName(file.name, "protected"), data: bytes }];
      }
      case "watermark": {
        const bytes = await addWatermark(buf, {
          text: wmText.trim() || "CONFIDENTIAL",
          opacity: 0.25,
          fontSize: 48,
          color: "#000000",
          position: "diagonal",
        });
        return [{ name: suggestedName(file.name, "watermarked"), data: bytes }];
      }
      case "rotate": {
        const bytes = await rotatePages(buf, 90);
        return [{ name: suggestedName(file.name, "rotated"), data: bytes }];
      }
      default:
        throw new Error("Unsupported operation");
    }
  };

  const runBatch = async () => {
    if (!files.length) {
      toast.error("Add at least one PDF");
      return;
    }
    if (opMeta.needsPassword && !password) {
      toast.error("Enter a password for this operation");
      return;
    }
    if (opMeta.needsText && !wmText.trim()) {
      toast.error("Enter watermark text");
      return;
    }

    cancelRef.current = false;
    setBusy(true);
    setOverall(5);

    const workList = files.slice(0, SOFT_LIMITS.batchMaxFiles);
    const skipped = files.slice(SOFT_LIMITS.batchMaxFiles);
    for (const s of skipped) {
      updateItem(s.id, {
        status: "skipped",
        error: `Skipped — soft limit ${SOFT_LIMITS.batchMaxFiles} files`,
      });
    }

    let doneCount = 0;
    for (const f of workList) {
      if (cancelRef.current) break;
      updateItem(f.id, { status: "running", error: undefined, outputs: undefined });
      try {
        const outputs = await processOne(f.file);
        if (cancelRef.current) {
          updateItem(f.id, { status: "queued" });
          break;
        }
        updateItem(f.id, { status: "done", outputs });
      } catch (e) {
        const info = classifyProcessError(e);
        updateItem(f.id, {
          status: "error",
          error: info.message,
        });
      }
      doneCount += 1;
      setOverall(Math.round((doneCount / workList.length) * 100));
    }

    setBusy(false);
    if (cancelRef.current) {
      toast.message("Batch cancelled");
    } else {
      toast.success("Batch finished");
    }
  };

  const cancel = () => {
    cancelRef.current = true;
  };

  const resetAll = () => {
    cancelRef.current = true;
    clear();
    setItems({});
    setOverall(0);
    setBusy(false);
  };

  const doneOutputs = useMemo(() => {
    const out: { name: string; data: Uint8Array }[] = [];
    for (const f of files) {
      const item = items[f.id];
      if (item?.status === "done" && item.outputs) {
        // Prefix with original basename folder when multiple files to avoid collisions
        const prefix =
          files.length > 1
            ? (f.name.replace(/\.pdf$/i, "") || f.id).slice(0, 40) + "/"
            : "";
        for (const o of item.outputs) {
          const name = o.name.includes("/")
            ? o.name
            : `${prefix}${o.name}`;
          out.push({ name, data: o.data });
        }
      }
    }
    return out;
  }, [files, items]);

  const doneCount = Object.values(items).filter((i) => i.status === "done").length;
  const errorCount = Object.values(items).filter((i) => i.status === "error").length;

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              100% local — files never leave this device. Pick one operation for
              the whole queue, then download a ZIP when finished. Multi-step
              sequences on one file:{" "}
              <Link href="/workflows" className="underline underline-offset-2">
                Action Wizard
              </Link>
              .
            </p>
            <div className="space-y-2">
              <Label>Operation</Label>
              <div className="flex flex-col gap-1.5">
                {OPS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setOp(o.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm transition",
                      op === o.id
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-[var(--hairline)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="font-medium">{o.label}</span>
                    <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                      {o.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {opMeta.needsPassword && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
              </div>
            )}
            {opMeta.needsText && (
              <div className="space-y-2">
                <Label>Watermark text</Label>
                <Input
                  value={wmText}
                  onChange={(e) => setWmText(e.target.value)}
                  disabled={busy}
                />
              </div>
            )}
                        {op === "ocr" && (
              <div className="space-y-2">
                <Label>OCR language</Label>
                <div className="flex flex-wrap gap-2">
                  {OCR_LANGS.filter((l) => l.prominent).map((l) => (
                    <Button
                      key={l.id}
                      type="button"
                      size="sm"
                      variant={ocrLang === l.id ? "default" : "outline"}
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => setOcrLang(l.id)}
                    >
                      {l.label}
                    </Button>
                  ))}
                </div>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={OCR_LANGS.some((m) => !m.prominent && m.id === ocrLang) ? ocrLang : ""}
                  onChange={(e) => {
                    if (e.target.value) setOcrLang(e.target.value);
                  }}
                  disabled={busy}
                  aria-label="More OCR languages"
                >
                  <option value="">More languages…</option>
                  {OCR_LANGS.filter((l) => !l.prominent).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
<SoftLimitsNote kind="batch" />
            <Button
              className="w-full"
              disabled={!files.length || busy}
              onClick={runBatch}
            >
              {busy ? "Processing…" : `Run on ${Math.min(files.length, SOFT_LIMITS.batchMaxFiles) || ""} file(s)`}
            </Button>
            {busy && (
              <Button className="w-full" variant="outline" onClick={cancel}>
                Cancel
              </Button>
            )}
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          multiple
          disabled={busy}
          onFiles={(fs) => {
            const pdfs = fs.filter(isPdfFile);
            if (pdfs.length !== fs.length) toast.error("Only PDF files accepted");
            if (!pdfs.length) return;
            addFiles(pdfs);
          }}
          label="Drop PDFs for batch processing"
          hint={`Up to ${SOFT_LIMITS.batchMaxFiles} files · ~${SOFT_LIMITS.batchMaxTotalBytes / (1024 * 1024)} MB total`}
        />

        {limitMessages.length > 0 && (
          <ul className="space-y-1.5">
            {limitMessages.map((m, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        )}

        {files.length > 0 && (
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-3 shadow-[var(--shadow-sm)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Queue · {files.length} file{files.length === 1 ? "" : "s"} ·{" "}
                {formatBytes(totalBytes)}
              </p>
              {!busy && (
                <Button size="sm" variant="ghost" onClick={resetAll}>
                  Clear
                </Button>
              )}
            </div>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {files.map((f) => {
                const item = items[f.id] ?? { id: f.id, status: "queued" as const };
                return (
                  <li
                    key={f.id}
                    className="flex items-start gap-2 rounded-xl border border-[var(--hairline)] px-3 py-2"
                  >
                    <StatusIcon status={item.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-[11px] text-[var(--muted)]">
                        {formatBytes(f.size)}
                        {item.status === "error" && item.error
                          ? ` · ${item.error}`
                          : ""}
                        {item.status === "skipped" && item.error
                          ? ` · ${item.error}`
                          : ""}
                        {item.status === "done" && item.outputs
                          ? ` · ${item.outputs.length} output(s)`
                          : ""}
                      </p>
                    </div>
                    {!busy && item.status !== "running" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-zinc-400"
                        onClick={() => remove(f.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {busy && (
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-4">
            <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
              <span>Batch progress</span>
              <span className="tabular-nums">{overall}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{ width: `${overall}%` }}
              />
            </div>
          </div>
        )}

        {doneOutputs.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {doneCount} ready
                {errorCount ? ` · ${errorCount} failed` : ""}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Suggested: batch-{op}-results.zip · {doneOutputs.length} file(s) in archive
              </p>
            </div>
            <Button
              className="min-h-11"
              onClick={() =>
                void downloadZip(doneOutputs, `batch-${op}-results.zip`)
              }
            >
              <Download className="h-4 w-4" />
              Download ZIP
            </Button>
            <Button variant="outline" className="min-h-11" onClick={resetAll}>
              Process another
            </Button>
          </div>
        )}
      </ToolShell>
    </MarketingShell>
  );
}

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "running")
    return <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" />;
  if (status === "done")
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === "error")
    return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />;
  if (status === "skipped")
    return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />;
  return <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />;
}
