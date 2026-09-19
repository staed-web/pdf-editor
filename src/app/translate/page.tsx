"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { extractTextFromPdf } from "@/lib/pdf/ops";
import { translateTextLocal } from "@/lib/pdf/extra-ops";
import { downloadBytes, isPdfFile } from "@/lib/download";

const tool = getTool("translate")!;

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState("es");
  const [method, setMethod] = useState("");
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const pages = await extractTextFromPdf(await file.arrayBuffer());
      const src = pages.map((p)=>`## Page ${p.page}\n\n${p.text}`).join("\n\n");
      const out = await translateTextLocal(src, lang);
      setMethod(out.method);
      setPreview(out.text.slice(0, 4000));
      const bilingual = `# Source\n\n${src.slice(0,20000)}\n\n---\n\n# Translation (${lang}) via ${out.method}\n\n${out.text}`;
      setResult(new TextEncoder().encode(bilingual));
      toast.success(`Translated via ${out.method}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed");
    } finally { setBusy(false); }
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">100% free: prefers Chrome <code>Translator</code> API when available; otherwise offline glossary stub. No paid MT. Download bilingual TXT always works.</p>
          <div className="space-y-2">
            <Label>Target language</Label>
            <select className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={lang} onChange={(e)=>setLang(e.target.value)}>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="hi">Hindi</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          {method && <p className="text-xs text-emerald-600">Method: {method}</p>}
          <Button className="w-full" disabled={!file||busy} onClick={run}>{busy?"Working…":"Translate"}</Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={(fs)=>{ const f=fs.find(isPdfFile); if(!f) return toast.error("PDF only"); setFile(f); setResult(null); setPreview(""); }} label={file?file.name:"Drop a PDF"} />
        {preview && <pre className="max-h-64 overflow-auto rounded-xl border p-3 text-xs whitespace-pre-wrap">{preview}</pre>}
        {result && <ResultBar fileName="translation.txt" size={result.byteLength} onDownload={()=>downloadBytes(result,"translation.txt","text/plain")} />}
      </ToolShell>
    </MarketingShell>
  );
}
