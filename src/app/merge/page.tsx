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
import { mergePdfFiles } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";
import {
  SOFT_LIMITS,
  memoryWarning,
  suggestedName,
  classifyProcessError,
} from "@/lib/pdf/process-ux";
import { formatBytes } from "@/lib/utils";

const tool = getTool("merge")!;

export default function MergePage() {
  const { files, addFiles, remove, reorder, clear } = useToolFiles();
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [resultName, setResultName] = useState("merged.pdf");
  const [bookmarks, setBookmarks] = useState(true);
  const job = useProcessJob();

  const totalBytes = useMemo(
    () => files.reduce((a, f) => a + f.size, 0),
    [files]
  );
  const warnings = useMemo(() => {
    const w: string[] = [];
    const mem = memoryWarning(totalBytes, null);
    if (mem) w.push(mem);
    if (files.length > SOFT_LIMITS.batchMaxFiles) {
      w.push(
        `You selected ${files.length} files — soft limit is ${SOFT_LIMITS.batchMaxFiles} for smooth merging.`
      );
    }
    return w;
  }, [files.length, totalBytes]);

  const resetAll = () => {
    clear();
    setResult(null);
    job.resetError();
  };

  const run = async () => {
    if (files.length < 2) {
      job.setError(
        classifyProcessError(new Error("Add at least two PDFs to merge"))
      );
      return;
    }
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
              <Switch id="bm" checked={bookmarks} onCheckedChange={setBookmarks} />
            </div>
            <SoftLimitsNote />
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          multiple
          onFiles={(f) => {
            const pdfs = f.filter(isPdfFile);
            if (pdfs.length !== f.length) toast.error("Only PDF files accepted");
            addFiles(pdfs);
            setResult(null);
            job.resetError();
          }}
          label="Drop PDFs to merge"
          hint="Reorder below, then merge"
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
