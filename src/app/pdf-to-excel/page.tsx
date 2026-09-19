"use client";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { extractTextFromPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("pdf-to-excel")!;

export default function PdfToExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const pages = await extractTextFromPdf(await file.arrayBuffer());
      const rows: string[][] = [];
      for (const p of pages) {
        rows.push([`Page ${p.page}`]);
        for (const line of p.text.split(/\n|(?<=\.)\s+/)) {
          const cells = line.trim().split(/\s{2,}|\t/).filter(Boolean);
          if (cells.length) rows.push(cells);
        }
        rows.push([]);
      }
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Extract");
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
      setResult(out);
      toast.success("Spreadsheet created (best-effort text split)");
    } catch {
      toast.error("Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Splits extracted text into cells. True table detection is limited client-side.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Export XLSX"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {result && <ResultBar fileName="extract.xlsx" size={result.byteLength} onDownload={()=>downloadBytes(result,"extract.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")} />}
      </ToolShell>
    </MarketingShell>
  );
}
