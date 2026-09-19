"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { convertPdfToDocx, type PdfToDocxMode } from "@/lib/pdf/pdf-to-docx";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("pdf-to-word")!;

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<PdfToDocxMode>("rich");

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(5);
    setResult(null);
    try {
      const bytes = await convertPdfToDocx(await file.arrayBuffer(), {
        mode,
        pageBreaks: true,
        onProgress: (pct) => setProgress(Math.max(5, pct)),
      });
      const base = file.name.replace(/\.pdf$/i, "") || "export";
      setResult({ name: `${base}.docx`, bytes });
      setProgress(100);
      toast.success(
        mode === "rich"
          ? "DOCX ready (layout + images for empty pages)"
          : "DOCX ready (fast text)"
      );
    } catch (e) {
      console.error(e);
      toast.error("Conversion failed");
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Free local approximation: clusters text into lines/paragraphs, keeps
              bold/italic/size heuristics, and (Rich mode) embeds page JPEGs when a
              page has no extractable text. Not a perfect Word clone.
            </p>
            <div className="space-y-2">
              <Label>Quality mode</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={mode === "fast" ? "default" : "outline"}
                  onClick={() => setMode("fast")}
                >
                  Fast (text)
                </Button>
                <Button
                  size="sm"
                  variant={mode === "rich" ? "default" : "outline"}
                  onClick={() => setMode("rich")}
                >
                  Rich (layout + images)
                </Button>
              </div>
            </div>
            <Button className="w-full" disabled={!file || busy} onClick={run}>
              {busy ? "Converting…" : "Export DOCX"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={(fs) => {
            const f = fs.find(isPdfFile);
            if (!f) return toast.error("PDF only");
            setFile(f);
            setResult(null);
          }}
          label={file ? file.name : "Drop a PDF"}
        />
        {busy && <ProgressBar value={progress} label="Building Word document…" />}
        {result && (
          <ResultBar
            fileName={result.name}
            size={result.bytes.byteLength}
            onDownload={() =>
              downloadBytes(
                result.bytes,
                result.name,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              )
            }
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
