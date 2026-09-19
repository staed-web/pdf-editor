"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { excelToPdfBytes } from "@/lib/pdf/office-to-pdf";
import { downloadBytes } from "@/lib/download";

const tool = getTool("excel-to-pdf")!;

export default function ExcelToPdfPage() {
  const [name, setName] = useState<string | null>(null);
  const [html, setHtml] = useState("");
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !/\.(xlsx|xls)$/i.test(f.name)) return toast.error("Drop an Excel file");
    setName(f.name);
    setResult(null);
    try {
      const ab = await f.arrayBuffer();
      setBuffer(ab.slice(0));
      const wb = XLSX.read(ab, { type: "array" });
      const parts = wb.SheetNames.map((n) => {
        const sheet = wb.Sheets[n];
        const table = XLSX.utils.sheet_to_html(sheet);
        return `<h2>${n}</h2>${table}`;
      });
      setHtml(parts.join(""));
      toast.success("Sheet loaded — download PDF or print");
    } catch {
      toast.error("Could not read spreadsheet");
    }
  };

  const downloadPdf = async () => {
    if (!buffer) return;
    setBusy(true);
    try {
      const bytes = await excelToPdfBytes(buffer);
      setResult(bytes);
      toast.success("PDF ready");
    } catch (e) {
      console.error(e);
      toast.error("Conversion failed");
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
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;padding:24px} table{border-collapse:collapse;width:100%;font-size:11px} td,th{border:1px solid #ccc;padding:4px 6px}</style></head><body>${html}</body></html>`
    );
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  const outName = (name || "sheet").replace(/\.(xlsx|xls)$/i, "") + ".pdf";

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Builds a real PDF table via SheetJS + pdf-lib (download). Print
              remains available for styled HTML output.
            </p>
            <Button className="w-full" disabled={!buffer || busy} onClick={downloadPdf}>
              {busy ? "Building…" : "Download PDF"}
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
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onFiles={onFiles}
          label={name || "Drop an Excel file"}
        />
        {result && (
          <ResultBar
            fileName={outName}
            size={result.byteLength}
            onDownload={() => downloadBytes(result, outName)}
          />
        )}
        {html && (
          <div
            className="max-h-96 overflow-auto rounded-2xl border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        <iframe ref={frameRef} className="hidden" title="print" />
      </ToolShell>
    </MarketingShell>
  );
}
