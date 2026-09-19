"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { getTool } from "@/lib/tools";
import { extractTextFromPdf } from "@/lib/pdf/ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("summarize")!;

function localOutline(text: string) {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
  const scored = sentences.map((s) => {
    const words = s.toLowerCase().split(/\W+/);
    const score = words.filter((w) => w.length > 5).length + (s.length > 120 ? 1 : 0);
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(8, Math.max(3, Math.floor(sentences.length * 0.15))));
  // keep original order
  const set = new Set(top.map((t) => t.s));
  return sentences.filter((s) => set.has(s));
}

export default function SummarizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [outline, setOutline] = useState<string[]>([]);
  const [full, setFull] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const pages = await extractTextFromPdf(await file.arrayBuffer());
      const text = pages.map((p) => p.text).join("\n");
      setFull(text);
      const bullets = localOutline(text);
      setOutline(bullets);
      const md = `# Outline\n\n${bullets.map((b)=>`- ${b}`).join("\n")}\n\n---\n\n# Extracted text\n\n${text}`;
      setResult(new TextEncoder().encode(md));
      toast.success(bullets.length ? "Outline ready" : "Little extractable text — try OCR");
    } catch {
      toast.error("Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Local extract + heuristic outline. No paid API required.</p>
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Extract & outline"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setOutline([]); setResult(null); }} label={file?file.name:"Drop a PDF"} />
        {outline.length > 0 && (
          <ul className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            {outline.map((b, i) => (
              <li key={i} className="flex gap-2"><span className="text-amber-600">•</span><span>{b}</span></li>
            ))}
          </ul>
        )}
        {result && <ResultBar fileName="outline.md" size={result.byteLength} onDownload={()=>downloadBytes(result,"outline.md","text/markdown")} />}
      </ToolShell>
    </MarketingShell>
  );
}
