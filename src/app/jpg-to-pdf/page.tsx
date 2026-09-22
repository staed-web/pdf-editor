"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { FileQueue } from "@/components/tools/FileQueue";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { imagesToPdf } from "@/lib/pdf/ops";
import { downloadBytes, fileToImageBytes, isImageFile } from "@/lib/download";
import {
  SOFT_LIMITS,
  memoryWarning,
  suggestedName,
  classifyProcessError,
} from "@/lib/pdf/process-ux";

const tool = getTool("jpg-to-pdf")!;

export default function Page() {
  const { files, addFiles, remove, reorder, clear } = useToolFiles();
  const [pageSize, setPageSize] = useState<"auto" | "a4" | "letter">("auto");
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(
    null
  );
  const job = useProcessJob();

  const totalBytes = useMemo(
    () => files.reduce((a, f) => a + f.size, 0),
    [files]
  );
  const warnings = useMemo(() => {
    const w: string[] = [];
    const mem = memoryWarning(totalBytes, files.length);
    if (mem) w.push(mem);
    if (files.length > SOFT_LIMITS.batchMaxFiles) {
      w.push(`Soft limit ${SOFT_LIMITS.batchMaxFiles} images for smooth conversion.`);
    }
    return w;
  }, [files.length, totalBytes]);

  const resetAll = () => {
    clear();
    setResult(null);
    job.resetError();
  };

  const run = async () => {
    if (!files.length) {
      job.setError(classifyProcessError(new Error("Add at least one image")));
      return;
    }
    const bytes = await job.run(async ({ setProgress, setLabel, isCancelled }) => {
      setLabel("Building PDF…");
      setProgress(15);
      const imgs = [];
      for (let i = 0; i < files.length; i++) {
        if (isCancelled()) throw new DOMException("Aborted", "AbortError");
        imgs.push(await fileToImageBytes(files[i].file));
        setProgress(15 + Math.round((i / files.length) * 60));
      }
      setLabel("Writing PDF…");
      const out = await imagesToPdf(imgs, { pageSize });
      if (isCancelled()) throw new DOMException("Aborted", "AbortError");
      return out;
    });
    if (!bytes) return;
    const name = suggestedName(files[0]?.name || "images", "from-jpg");
    setResult({ bytes, name });
    toast.success("PDF created");
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <div className="space-y-2">
              <Label>Page size</Label>
              <div className="flex flex-wrap gap-2">
                {(["auto", "a4", "letter"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={pageSize === s ? "default" : "outline"}
                    onClick={() => setPageSize(s)}
                    className="capitalize"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <SoftLimitsNote />
            <Button
              className="w-full"
              disabled={!files.length || job.busy}
              onClick={run}
            >
              {job.busy ? "Building…" : "Create PDF"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="image/jpeg,.jpg,.jpeg"
          multiple
          onFiles={(fs) => {
            const imgs = fs.filter(isImageFile);
            if (!imgs.length) return toast.error("Images only");
            addFiles(imgs);
            setResult(null);
            job.resetError();
          }}
          label="Drop JPG images"
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
            fileName={result.name}
            size={result.bytes.byteLength}
            blob={result.bytes}
            fromTool="jpg-to-pdf"
            onDownload={() => downloadBytes(result.bytes, result.name)}
            onProcessAnother={resetAll}
          />
        )}
        {files.length > 0 && (
          <Button variant="outline" onClick={resetAll} disabled={job.busy}>
            Clear
          </Button>
        )}
      </ToolShell>
    </MarketingShell>
  );
}
