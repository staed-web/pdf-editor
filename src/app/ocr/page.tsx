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
import { Switch } from "@/components/ui/switch";
import { getTool } from "@/lib/tools";
import { renderPdfPages } from "@/lib/pdf/ops";
import { ocrToSearchablePdf } from "@/lib/pdf/ocr-searchable";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { createWorker } from "tesseract.js";

const tool = getTool("ocr")!;

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [resultName, setResultName] = useState("ocr.txt");
  const [mime, setMime] = useState("text/plain");
  const [searchable, setSearchable] = useState(true);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(5);
    setText("");
    setResult(null);
    try {
      if (searchable) {
        const out = await ocrToSearchablePdf(await file.arrayBuffer(), {
          onProgress: (pct, label) => {
            setProgress(pct);
            void label;
          },
        });
        setText(out.text);
        setResult(out.bytes);
        setResultName("searchable-ocr.pdf");
        setMime("application/pdf");
        toast.success("Searchable OCR PDF ready");
      } else {
        const pages = await renderPdfPages(await file.arrayBuffer(), {
          format: "png",
          scale: 2,
        });
        const worker = await createWorker("eng", 1, {
          logger: (m) => {
            if (m.status === "recognizing text" && typeof m.progress === "number") {
              setProgress(10 + Math.round(m.progress * 80));
            }
          },
        });
        const chunks: string[] = [];
        for (let i = 0; i < pages.length; i++) {
          setProgress(10 + Math.round((i / pages.length) * 80));
          const { data } = await worker.recognize(pages[i].blob);
          chunks.push(`--- Page ${i + 1} ---\n${data.text}`);
        }
        await worker.terminate();
        const full = chunks.join("\n\n");
        setText(full);
        setResult(new TextEncoder().encode(full));
        setResultName("ocr.txt");
        setMime("text/plain");
        setProgress(100);
        toast.success("OCR complete");
      }
    } catch (e) {
      console.error(e);
      toast.error("OCR failed");
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
            <p className="text-xs text-zinc-500">
              Runs Tesseract.js in your browser. Searchable mode embeds page
              images plus an invisible text layer from word boxes.
            </p>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="searchable">Searchable PDF output</Label>
              <Switch
                id="searchable"
                checked={searchable}
                onCheckedChange={setSearchable}
              />
            </div>
            <Button className="w-full" disabled={!file || busy} onClick={run}>
              {busy ? "Recognizing…" : searchable ? "Make searchable PDF" : "Run OCR (text)"}
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
            setText("");
            setResult(null);
          }}
          label={file ? file.name : "Drop a scanned PDF"}
        />
        {busy && <ProgressBar value={progress} label="OCR in progress…" />}
        {text && (
          <textarea
            className="min-h-48 w-full rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900"
            readOnly
            value={text}
          />
        )}
        {result && (
          <ResultBar
            fileName={resultName}
            size={result.byteLength}
            onDownload={() => downloadBytes(result, resultName, mime)}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
