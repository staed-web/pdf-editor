"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";

const tool = getTool("html-to-pdf")!;

export default function HtmlToPdfPage() {
  const [html, setHtml] = useState("<h1>Hello InstantPDFEdit</h1><p>Paste HTML and print to PDF.</p>");
  const frameRef = useRef<HTMLIFrameElement>(null);

  const run = () => {
    const iframe = frameRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:24px;color:#18181b}</style></head><body>${html}</body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      toast.message("Use your browser’s Print → Save as PDF");
    }, 200);
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <Button className="w-full" onClick={run}>Print / Save as PDF</Button>
      }>
        <div className="space-y-2">
          <Label>HTML</Label>
          <textarea
            className="min-h-48 w-full rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900"
            value={html}
            onChange={(e)=>setHtml(e.target.value)}
          />
        </div>
        <iframe ref={frameRef} title="preview" className="h-64 w-full rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800" />
      </ToolShell>
    </MarketingShell>
  );
}
