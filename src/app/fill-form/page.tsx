"use client";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { storeHandoff } from "@/lib/storage/handoff";
import { useRouter } from "next/navigation";

const tool = getTool("fill-form")!;

export default function FillFormPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<{name:string;value:string;type:string}[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [buf, setBuf] = useState<ArrayBuffer | null>(null);

  const onFiles = async (files: File[]) => {
    const f = files.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setFile(f); setResult(null);
    const ab = await f.arrayBuffer();
    setBuf(ab);
    const { listFormFields } = await import("@/lib/pdf/export");
    const list = await listFormFields(ab);
    setFields(list.map((x)=>({ name:x.name, value:x.value, type:x.type })));
    if (!list.length) toast.message("No AcroForm fields detected — try the full editor");
  };

  const run = async () => {
    if (!buf) return;
    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(buf.slice(0), { ignoreEncryption: true });
      const form = doc.getForm();
      for (const f of fields) {
        try {
          const field = form.getFieldMaybe(f.name);
          if (!field) continue;
          if ("setText" in field) (field as {setText:(t:string)=>void}).setText(f.value);
          else if ("check" in field) {
            const cb = field as unknown as { check:()=>void; uncheck:()=>void };
            if (f.value === "true" || f.value === "Yes" || f.value === "1") cb.check();
            else cb.uncheck();
          } else if ("select" in field) {
            (field as unknown as {select:(v:string)=>void}).select(f.value);
          }
        } catch { /* */ }
      }
      const bytes = await doc.save();
      setResult(bytes);
      toast.success("Form filled");
    } catch {
      toast.error("Could not write fields");
    } finally { setBusy(false); }
  };

  const flattenNext = async () => {
    if (!result) return;
    await storeHandoff({
      data: result,
      name: "filled-form.pdf",
      fromTool: "fill-form",
      toHref: "/flatten",
      intent: "open",
    });
    router.push("/flatten");
  };

  return (
    <MarketingShell>
      <ToolShell tool={tool} options={
        <>
          <p className="text-xs text-zinc-500">
            Contract path: fill → flatten → download. After saving, hand off to
            Flatten (or Sign) so fields can&apos;t be changed.
          </p>
          <Button className="w-full" disabled={!fields.length||busy} onClick={run}>{busy?"Saving…":"Save filled PDF"}</Button>
          <Button className="w-full" variant="secondary" disabled={!result||busy} onClick={() => void flattenNext()}>
            Flatten &amp; download next
          </Button>
          <Button asChild variant="outline" className="w-full"><Link href="/edit">Open in editor</Link></Button>
          <Button asChild variant="outline" className="w-full"><Link href="/sign">Then sign</Link></Button>
        </>
      }>
        <DropZone accept="application/pdf" onFiles={onFiles} label={file?file.name:"Drop a fillable PDF"} />
        {fields.length > 0 && (
          <div className="max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            {fields.map((f, i) => (
              <div key={f.name} className="space-y-1">
                <Label className="text-xs">{f.name} <span className="text-zinc-400">({f.type})</span></Label>
                <Input value={f.value} onChange={(e)=>{
                  const v = e.target.value;
                  setFields((prev)=>prev.map((x,j)=>j===i?{...x,value:v}:x));
                }} />
              </div>
            ))}
          </div>
        )}
        {result && <ResultBar fileName="filled-form.pdf" size={result.byteLength} onDownload={()=>downloadBytes(result,"filled-form.pdf")} />}
      </ToolShell>
    </MarketingShell>
  );
}
