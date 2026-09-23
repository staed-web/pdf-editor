"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileUp, Sparkles, Shield, Zap, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editorStore";
import {
  listRecentFiles,
  loadRecentFile,
  removeRecentFile,
} from "@/lib/storage/recent";
import type { RecentFileMeta } from "@/store/types";
import { formatBytes, cn } from "@/lib/utils";
import { consumeHandoff } from "@/lib/storage/handoff";

export function EmptyState() {
  const openFile = useEditorStore((s) => s.openFile);
  const setTool = useEditorStore((s) => s.setTool);
  const isLoading = useEditorStore((s) => s.isLoading);
  const loadError = useEditorStore((s) => s.loadError);
  const [dragOver, setDragOver] = useState(false);
  const [recent, setRecent] = useState<RecentFileMeta[]>([]);

  const refreshRecent = useCallback(async () => {
    try {
      setRecent(await listRecentFiles());
    } catch {
      /* idb unavailable */
    }
  }, []);

  useEffect(() => {
    void refreshRecent();
  }, [refreshRecent]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const payload = await consumeHandoff("/edit");
      if (!payload || cancelled) return;
      try {
        await openFile(payload.file);
        if (payload.intent === "sign") {
          setTool("signature");
        }
        toast.success(`Loaded “${payload.meta.name}” from previous step`);
        void refreshRecent();
      } catch {
        toast.error("Could not load handed-off file");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intake once on mount
  }, []);

  useEffect(() => {
    if (loadError) toast.error(loadError);
  }, [loadError]);

  const handleFiles = async (files: FileList | File[] | null) => {
    const file = files && (files instanceof FileList ? files[0] : files[0]);
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please drop a PDF file");
      return;
    }
    await openFile(file);
    void refreshRecent();
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-start overflow-y-auto overscroll-contain px-6 py-8 sm:justify-center sm:py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.08),_transparent_60%)]" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-2xl shadow-amber-500/25">
            <span className="text-xl font-black text-zinc-950">I</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            InstantPDFEdit
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Every PDF tool. Instantly. Annotate, rearrange, sign — entirely in your browser.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "relative rounded-2xl border-2 border-dashed p-10 text-center transition-all",
            dragOver
              ? "border-amber-400 bg-amber-500/10 scale-[1.01]"
              : "border-[var(--border)] bg-[var(--card)] hover:border-amber-400/50"
          )}
        >
          <FileUp className="mx-auto mb-3 h-10 w-10 text-amber-400/80" />
          <p className="text-sm font-medium text-foreground">
            Drop a PDF here, or choose a file
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Files never leave this device
          </p>
          <label className="mt-5 inline-block">
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={isLoading}
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <Button asChild disabled={isLoading} className="cursor-pointer">
              <span>{isLoading ? "Opening…" : "Open PDF"}</span>
            </Button>
          </label>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch("/sample.pdf");
                  const buf = await res.arrayBuffer();
                  await openFile({ name: "sample.pdf", data: buf, size: buf.byteLength });
                } catch {
                  toast.error("Sample PDF not available");
                }
              }}
            >
              Create and open sample
            </Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { icon: Shield, title: "Private", desc: "Client-side only" },
            { icon: Zap, title: "Fast", desc: "Instant annotations" },
            { icon: Sparkles, title: "Polished", desc: "Export-ready marks" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center"
            >
              <f.icon className="mx-auto mb-1.5 h-4 w-4 text-amber-400/80" />
              <p className="text-xs font-semibold text-zinc-200">{f.title}</p>
              <p className="text-[10px] text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>

        {recent.length > 0 && (
          <div className="mt-8">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <Clock className="h-3.5 w-3.5" /> Recent
            </div>
            <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
              {recent.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={async () => {
                      const loaded = await loadRecentFile(r.id);
                      if (!loaded) {
                        toast.error("Could not load recent file");
                        await removeRecentFile(r.id);
                        void refreshRecent();
                        return;
                      }
                      await openFile({
                        name: loaded.meta.name,
                        data: loaded.data,
                        size: loaded.meta.size,
                      });
                    }}
                  >
                    <p className="truncate text-sm text-zinc-200">{r.name}</p>
                    <p className="text-[10px] text-zinc-500">
                      {r.pageCount} pages · {formatBytes(r.size)} ·{" "}
                      {new Date(r.lastOpened).toLocaleString()}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-zinc-500"
                    onClick={async () => {
                      await removeRecentFile(r.id);
                      void refreshRecent();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  );
}
