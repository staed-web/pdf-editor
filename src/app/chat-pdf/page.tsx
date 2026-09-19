"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { extractTextFromPdf } from "@/lib/pdf/ops";
import { extractiveAnswer } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("chat-pdf")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<{page:number;text:string}[]|null>(null);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [evidence, setEvidence] = useState<{page:number;sentence:string;score:number}[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f); setAnswer(""); setEvidence([]); setResult(null);
    setBusy(true);
    try {
      const p = await extractTextFromPdf(await f.arrayBuffer());
      setPages(p);
      toast.success(`Loaded ${p.length} pages`);
    } catch { toast.error("Extract failed"); }
    finally { setBusy(false); }
  };

  const ask = async () => {
    if (!pages || !q.trim()) return;
    setBusy(true);
    try {
      const out = extractiveAnswer(pages, q);
      setAnswer(out.answer);
      setEvidence(out.evidence);
      const md = `# Q\n${q}\n\n# A\n${out.answer}\n`;
      setResult(new TextEncoder().encode(md));
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">Free extractive Q&amp;A — keyword/sentence ranking. No paid LLM, no cloud.</p>
          <div className="space-y-2"><Label>Question</Label><Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="What is the agreement about?" onKeyDown={(e)=>{ if(e.key==="Enter") ask(); }} /></div>
          <Button className="w-full" disabled={!pages||!q.trim()||busy} onClick={ask}>{busy?"Thinking…":"Ask"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={load} label={file?file.name:"Drop a PDF to ask"} />
        {answer && (
          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold">Answer</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
            {evidence.length > 0 && (
              <ul className="space-y-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
                {evidence.map((e,i)=>(
                  <li key={i}><span className="font-medium text-amber-700">p.{e.page}</span> · score {e.score.toFixed(1)}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {result && <ResultBar fileName="qa.md" size={result.byteLength} onDownload={()=>downloadBytes(result,"qa.md","text/markdown")} />}
      </ToolShell>
    </MarketingShell>
  );
}
