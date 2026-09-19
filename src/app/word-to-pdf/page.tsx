"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import mammoth from "mammoth";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";

const tool = getTool("word-to-pdf")!;

export default function WordToPdfPage() {
  const [name, setName] = useState<string | null>(null);
  const [html, setHtml] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f || !/\.docx$/i.test(f.name)) return toast.error("Please drop a .docx file");
    setName(f.name);
    try {
      const ab = await f.arrayBuffer();
      const res = await mammoth.convertToHtml({ arrayBuffer: ab });
      setHtml(res.value);
      toast.success("Converted to HTML — print to PDF");
    } catch {
      toast.error("Could not read DOCX");
    }
  };

  const printPdf = () => {
    const iframe = frameRef.current;
    if (!iframe || !html) return;
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;padding:32px;line-height:1.5;color:#111} img{max-width:100%}</style></head><body>${html}</body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }, 250);
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Best-effort: DOCX → HTML via Mammoth, then browser Print → Save as PDF.</p>
          <Button className="w-full" disabled={!html} onClick={printPdf}>Print / Save as PDF</Button>
        </>
      }>
        <DropZone accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onFiles={onFiles} label={name||"Drop a .docx file"} />
        {html && (
          <div className="prose prose-sm max-w-none rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
        )}
        <iframe ref={frameRef} className="hidden" title="print" />
      </ToolShell>
    </MarketingShell>
  );
}
