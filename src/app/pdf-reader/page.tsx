"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import { ensurePdfWorker, loadPdfDocument } from "@/lib/pdf/loader";
import { isPdfFile } from "@/lib/download";
import { cn } from "@/lib/utils";

const tool = getTool("pdf-reader")!;

type LangPref = "auto" | "en" | "hi";

function pickVoice(
  voices: SpeechSynthesisVoice[],
  pref: LangPref
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const byLang = (prefix: string) =>
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (pref === "hi") return byLang("hi") || byLang("en") || voices[0];
  if (pref === "en") return byLang("en") || voices[0];
  return byLang("en") || byLang("hi") || voices[0];
}

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pageText, setPageText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [langPref, setLangPref] = useState<LangPref>("auto");
  const [voiceLabel, setVoiceLabel] = useState("");
  const [scope, setScope] = useState<"page" | "selection">("page");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<Awaited<ReturnType<typeof loadPdfDocument>> | null>(
    null
  );

  const stopSpeech = () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* */
    }
    setSpeaking(false);
    setPaused(false);
  };

  const loadPageText = async (n: number) => {
    const doc = docRef.current;
    if (!doc) {
      setPageText("");
      return;
    }
    try {
      const p = await doc.getPage(n);
      const content = await p.getTextContent();
      const text = content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      setPageText(text);
      p.cleanup();
    } catch {
      setPageText("");
    }
  };

  const render = async (n: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    const p = await doc.getPage(n);
    const viewport = p.getViewport({ scale: 1.25 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await p.render({
      canvasContext: canvas.getContext("2d")!,
      viewport,
    }).promise;
    p.cleanup();
  };

  const onFiles = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setBusy(true);
    stopSpeech();
    try {
      if (docRef.current) docRef.current.destroy();
      ensurePdfWorker();
      const doc = await loadPdfDocument(await f.arrayBuffer());
      docRef.current = doc;
      setFile(f);
      setTotal(doc.numPages);
      setPage(1);
      await render(1);
      await loadPageText(1);
      toast.success(`${doc.numPages} pages`);
    } catch {
      toast.error("Failed to open");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (docRef.current && page >= 1) {
      void render(page);
      void loadPageText(page);
      stopSpeech();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    return () => {
      stopSpeech();
      docRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const sync = () => {
      const v = pickVoice(window.speechSynthesis.getVoices(), langPref);
      setVoiceLabel(v ? `${v.name} (${v.lang})` : "No voices available");
    };
    sync();
    window.speechSynthesis.addEventListener("voiceschanged", sync);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", sync);
  }, [langPref]);

  const getSpeakText = () => {
    if (scope === "selection") {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return "";
      const text = sel.toString().trim();
      if (!text) return "";
      // Prefer selection inside the text panel
      if (
        textRef.current &&
        (textRef.current.contains(sel.anchorNode) ||
          textRef.current.contains(sel.focusNode))
      ) {
        return text;
      }
      return text;
    }
    return pageText;
  };

  const speak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Speech synthesis not supported in this browser");
      return;
    }
    const text = getSpeakText();
    if (!text) {
      toast.message(
        scope === "selection"
          ? "Select text in the panel below first"
          : "No text on this page (scanned PDF?)"
      );
      return;
    }
    stopSpeech();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(window.speechSynthesis.getVoices(), langPref);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else if (langPref === "hi") {
      u.lang = "hi-IN";
    } else if (langPref === "en") {
      u.lang = "en-US";
    }
    u.rate = 1;
    u.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    u.onerror = () => {
      setSpeaking(false);
      setPaused(false);
      toast.error("Read aloud failed");
    };
    window.speechSynthesis.speak(u);
    setSpeaking(true);
    setPaused(false);
  };

  const togglePause = () => {
    if (!window.speechSynthesis || !speaking) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Private lightweight viewer — nothing leaves your device.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
            <p className="text-xs">
              {total ? `Page ${page} / ${total}` : "Load a PDF"}
            </p>

            <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Volume2 className="h-3.5 w-3.5" />
                Read aloud
              </div>
              <p className="text-[11px] text-zinc-500">
                Web Speech API · EN/HI when your browser has those voices.
              </p>
              <Label className="text-xs">Scope</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={scope === "page" ? "default" : "outline"}
                  onClick={() => setScope("page")}
                >
                  Page
                </Button>
                <Button
                  size="sm"
                  variant={scope === "selection" ? "default" : "outline"}
                  onClick={() => setScope("selection")}
                >
                  Selection
                </Button>
              </div>
              <Label className="text-xs">Voice preference</Label>
              <div className="flex flex-wrap gap-2">
                {(["auto", "en", "hi"] as LangPref[]).map((l) => (
                  <Button
                    key={l}
                    size="sm"
                    variant={langPref === l ? "default" : "outline"}
                    onClick={() => setLangPref(l)}
                    className="uppercase"
                  >
                    {l}
                  </Button>
                ))}
              </div>
              {voiceLabel && (
                <p className="truncate text-[11px] text-zinc-500">
                  {voiceLabel}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!file || busy}
                  onClick={() => speak()}
                >
                  <Play className="mr-1 h-3.5 w-3.5" />
                  Speak
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!speaking}
                  onClick={togglePause}
                  aria-label={paused ? "Resume" : "Pause"}
                >
                  <Pause className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!speaking && !paused}
                  onClick={stopSpeech}
                  aria-label="Stop"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={(fs) => void onFiles(fs)}
          label={file ? file.name : "Drop a PDF to read"}
        />
        {busy && <p className="text-sm text-zinc-500">Opening…</p>}
        <div className="overflow-auto rounded-2xl border border-zinc-200 bg-zinc-100 p-2 dark:border-zinc-800 dark:bg-zinc-950">
          <canvas ref={canvasRef} className="mx-auto max-w-full shadow" />
        </div>
        {pageText ? (
          <div
            ref={textRef}
            className={cn(
              "max-h-40 overflow-auto rounded-2xl border border-zinc-200 bg-white p-3 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200",
              "select-text"
            )}
            tabIndex={0}
            aria-label="Page text for selection and read aloud"
          >
            {pageText}
          </div>
        ) : (
          file &&
          !busy && (
            <p className="text-xs text-zinc-500">
              No extractable text on this page. Read aloud needs a text layer.
            </p>
          )
        )}
      </ToolShell>
    </MarketingShell>
  );
}
