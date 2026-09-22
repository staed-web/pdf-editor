"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { FileQueue } from "@/components/tools/FileQueue";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MultiFileSummary,
  ProcessProgress,
  ProcessError,
  ProcessSuccess,
  SoftLimitsNote,
} from "@/components/tools/process";
import { getTool } from "@/lib/tools";
import { useToolFiles } from "@/hooks/useToolFiles";
import { useProcessJob } from "@/hooks/useProcessJob";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  SOFT_LIMITS,
  memoryWarning,
  suggestedName,
  classifyProcessError,
} from "@/lib/pdf/process-ux";
import { formatBytes } from "@/lib/utils";

const tool = getTool("merge")!;

function rid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `f-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function MergePage() {
  const { files, remove, reorder, clear, setFiles } = useToolFiles();
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [resultName, setResultName] = useState("merged.pdf");
  const [bookmarks, setBookmarks] = useState(true);
  const job = useProcessJob();

  const totalBytes = useMemo(
    () => files.reduce((a, f) => a + f.size, 0),
    [files]
  );
  const knownPages = useMemo(() => {
    const nums = files
      .map((f) => f.pageCount)
      .filter((n): n is number => typeof n === "number");
    return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
  }, [files]);

  const warnings = useMemo(() => {
    const w: string[] = [];
    const mem = memoryWarning(totalBytes, knownPages);
    if (mem) w.push(mem);
    if (files.length > SOFT_LIMITS.batchMaxFiles) {
      w.push(
        `You selected ${files.length} files — soft limit is ${SOFT_LIMITS.batchMaxFiles} for smooth merging.`
      );
    }
    return w;
  }, [files.length, totalBytes, knownPages]);

  const resetAll = () => {
    clear();
    setResult(null);
    job.resetError();
  };

  const onAdd = (incoming: File[]) => {
    const pdfs = incoming.filter(isPdfFile);
    if (pdfs.length !== incoming.length) toast.error("Only PDF files accepted");
    if (!pdfs.length) return;
    setResult(null);
    job.resetError();
    const stamped = pdfs.map((file) => ({
      id: rid(),
      file,
      name: file.name,
      size: file.size,
      pageCount: undefined as number | null | undefined,
    }));
    setFiles((prev) => [...prev, ...stamped]);
    void (async () => {
      const { loadPdf } = await import("@/lib/pdf/ops");
      for (const item of stamped) {
        try {
          const doc = await loadPdf(await item.file.arrayBuffer());
          const pageCount = doc.getPageCount();
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, pageCount } : f))
          );
        } catch {
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, pageCount: null } : f))
          );
        }
      }
    })();
  };

  const run = async () => {
    if (files.length < 2) {
      job.setError(
        classifyProcessError(new Error("Add at least two PDFs to merge"))
      );
      return;
    }
    const { mergePdfFiles } = await import("@/lib/pdf/ops");
    const out = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Reading PDFs…");
      const buffers = [];
      for (let i = 0; i < files.length; i++) {
        if (isCancelled()) throw new DOMException("Aborted", "AbortError");
        buffers.push(await files[i].file.arrayBuffer());
        setProgress(10 + Math.round((i / files.length) * 60));
      }
      setLabel("Merging…");
      setProgress(75);
      const bytes = await mergePdfFiles(
        buffers,
        bookmarks
          ? { bookmarksFromNames: files.map((f) => f.file.name) }
          : undefined
      );
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      return bytes;
    });
    if (!out) return;
    const name = suggestedName(files[0]?.name || "merged", "merged");
    setResult(out);
    setResultName(name);
    toast.success(
      bookmarks ? "Merged with bookmark outline" : "Merged successfully"
    );
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="bm">Bookmarks from filenames</Label>
              <Switch
                id="bm"
                checked={bookmarks}
                onCheckedChange={setBookmarks}
              />
            </div>
            <SoftLimitsNote />
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          multiple
          onFiles={onAdd}
          label="Drop PDFs to merge"
          hint="Drag the handle to reorder · page badges load automatically"
        />
        <FileQueue files={files} onRemove={remove} onReorder={reorder} />
        {files.length > 0 && (
          <MultiFileSummary
            count={files.length}
            totalBytes={totalBytes}
            warnings={warnings}
          />
        )}
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
            fileName={resultName}
            size={result.byteLength}
            meta={`${files.length} files · ${formatBytes(totalBytes)} in`}
            blob={result}
            fromTool="merge"
            onDownload={() => downloadBytes(result, resultName)}
            onProcessAnother={resetAll}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={job.busy || files.length < 2}>
            Merge {files.length || ""} PDFs
          </Button>
          {files.length > 0 && (
            <Button variant="outline" onClick={resetAll} disabled={job.busy}>
              Clear
            </Button>
          )}
        </div>
      </ToolShell>
    </MarketingShell>
  );
}
