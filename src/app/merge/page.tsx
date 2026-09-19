"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { FileQueue } from "@/components/tools/FileQueue";
import { ResultBar } from "@/components/tools/ResultBar";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getTool } from "@/lib/tools";
import { useToolFiles } from "@/hooks/useToolFiles";
import { mergePdfFiles } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("merge")!;

export default function MergePage() {
  const { files, addFiles, remove, reorder, clear } = useToolFiles();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [bookmarks, setBookmarks] = useState(true);

  const run = async () => {
    if (files.length < 2) {
      toast.error("Add at least two PDFs");
      return;
    }
    setBusy(true);
    setProgress(10);
    try {
      const buffers = [];
      for (let i = 0; i < files.length; i++) {
        buffers.push(await files[i].file.arrayBuffer());
        setProgress(10 + Math.round((i / files.length) * 70));
      }
      const bytes = await mergePdfFiles(
        buffers,
        bookmarks
          ? { bookmarksFromNames: files.map((f) => f.file.name) }
          : undefined
      );
      setResult(bytes);
      setProgress(100);
      toast.success(
        bookmarks ? "Merged with bookmark outline" : "Merged successfully"
      );
    } catch (e) {
      console.error(e);
      toast.error("Merge failed — check that files are valid PDFs");
    } finally {
      setBusy(false);
    }
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
          }}
          label="Drop PDFs to merge"
          hint="Reorder below, then merge"
        />
        <FileQueue files={files} onRemove={remove} onReorder={reorder} />
        {busy && <ProgressBar value={progress} label="Merging…" />}
        {result && (
          <ResultBar
            fileName="merged.pdf"
            size={result.byteLength}
            onDownload={() => downloadBytes(result, "merged.pdf")}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={busy || files.length < 2}>
            Merge {files.length || ""} PDFs
          </Button>
          {files.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                clear();
                setResult(null);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </ToolShell>
    </MarketingShell>
  );
}
