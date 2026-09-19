"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import mammoth from "mammoth";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { docxToPdfBytes } from "@/lib/pdf/office-to-pdf";
import { downloadBytes } from "@/lib/download";

const tool = getTool("word-to-pdf")!;

const PRINT_CSS = `
  @page { margin: 0.75in; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    padding: 0; margin: 0; line-height: 1.55; color: #111; font-size: 12pt;
  }
  h1,h2,h3,h4 { font-family: system-ui, sans-serif; line-height: 1.25; }
  img { max-width: 100%; height: auto; display: block; margin: 0.6em 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
  td, th { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
  p { margin: 0 0 0.65em; }
  ul, ol { margin: 0.4em 0 0.8em; padding-left: 1.4em; }
`;

export default function WordToPdfPage() {
  const [name, setName] = useState<string | null>(null);
  const [html, setHtml] = useState("");
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !/\.docx$/i.test(f.name)) return toast.error("Please drop a .docx file");
    setName(f.name);
    setResult(null);
    try {
      const ab = await f.arrayBuffer();
      setBuffer(ab.slice(0));
      const res = await mammoth.convertToHtml({ arrayBuffer: ab });
      setHtml(res.value);
      toast.success("DOCX loaded — download PDF or print");
    } catch {
      toast.error("Could not read DOCX");
    }
  };

  const downloadPdf = async () => {
    if (!buffer) return;
    setBusy(true);
    setProgress(20);
    try {
      const bytes = await docxToPdfBytes(buffer, { fileName: name || "document" });
      setProgress(100);
      setResult(bytes);
      toast.success("PDF ready to download");
    } catch (e) {
      console.error(e);
      toast.error("PDF conversion failed — try Print / Save as PDF");
    } finally {
      setBusy(false);
    }
  };

  const printPdf = () => {
    const iframe = frameRef.current;
    if (!iframe || !html) return;
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${
        name || "document"
      }</title><style>${PRINT_CSS}</style></head><body>${html}</body></html>`
    );
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };

  const outName = (name || "document").replace(/\.docx$/i, "") + ".pdf";

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Free local: Mammoth DOCX→HTML, then InstantPDFEdit builds a PDF
              (html2canvas + jsPDF). Print remains as a high-fidelity fallback.
            </p>
            <Button className="w-full" disabled={!buffer || busy} onClick={downloadPdf}>
              {busy ? "Building PDF…" : "Download PDF"}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              disabled={!html}
              onClick={printPdf}
            >
              Print / Save as PDF
            </Button>
          </>
        }
      >
        <DropZone
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onFiles={onFiles}
          label={name || "Drop a .docx file"}
        />
        {busy && <ProgressBar value={progress} label="Rasterizing pages…" />}
        {result && (
          <ResultBar
            fileName={outName}
            size={result.byteLength}
            onDownload={() => downloadBytes(result, outName)}
          />
        )}
        {html && (
          <div
            className="prose prose-sm max-w-none rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        <iframe ref={frameRef} className="hidden" title="print" />
      </ToolShell>
    </MarketingShell>
  );
}
