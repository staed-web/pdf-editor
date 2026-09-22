"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Sparkles,
  ListTree,
} from "lucide-react";
import { MarketingShell } from "@/components/site/MarketingShell";
import { ToolShell } from "@/components/tools/ToolShell";
import { DropZone } from "@/components/tools/DropZone";
import { ResultBar } from "@/components/tools/ResultBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTool } from "@/lib/tools";
import {
  extractBookmarks,
  writeBookmarks,
  generateBookmarksFromHeadings,
  type BookmarkItem,
} from "@/lib/pdf/bookmarks";
import { downloadBytes, isPdfFile } from "@/lib/download";
import { cn } from "@/lib/utils";

const tool = getTool("bookmarks")!;

function uid() {
  return `bm_${Math.random().toString(36).slice(2, 10)}`;
}

export default function BookmarksPage() {
  const [file, setFile] = useState<File | null>(null);
  const [buf, setBuf] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const onFiles = async (fs: File[]) => {
    const f = fs.find(isPdfFile);
    if (!f) return toast.error("PDF only");
    setBusy(true);
    setResult(null);
    try {
      const ab = await f.arrayBuffer();
      setFile(f);
      setBuf(ab.slice(0));
      const list = await extractBookmarks(ab.slice(0));
      setItems(list);
      // page count via bookmarks write helper path — light load
      const { loadPdf } = await import("@/lib/pdf/ops");
      const doc = await loadPdf(ab.slice(0));
      setPageCount(doc.getPageCount());
      setNote(
        list.length
          ? `Loaded ${list.length} bookmark${list.length === 1 ? "" : "s"}`
          : "No bookmarks yet — add some or generate from headings"
      );
      toast.success(
        list.length ? `Found ${list.length} bookmarks` : "PDF opened (no outline)"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open");
    } finally {
      setBusy(false);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    setResult(null);
  };

  const update = (id: string, patch: Partial<BookmarkItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
    setResult(null);
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setResult(null);
  };

  const add = () => {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        title: `Bookmark ${prev.length + 1}`,
        pageIndex: 0,
        depth: 0,
      },
    ]);
    setResult(null);
  };

  const generate = async () => {
    if (!buf) return;
    setBusy(true);
    try {
      const out = await generateBookmarksFromHeadings(buf.slice(0));
      if (!out.items.length) {
        toast.message(out.note);
        setNote(out.note);
        return;
      }
      setItems(out.items);
      setNote(out.note);
      setResult(null);
      toast.success(out.note);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!buf) return;
    setBusy(true);
    try {
      const bytes = await writeBookmarks(
        buf.slice(0),
        items.map((it) => ({ title: it.title, pageIndex: it.pageIndex }))
      );
      setResult(bytes);
      setNote(
        items.length
          ? `Wrote ${items.length} bookmark${items.length === 1 ? "" : "s"}`
          : "Cleared outline"
      );
      toast.success("Bookmarks saved into PDF");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const outName = (file?.name || "document").replace(/\.pdf$/i, "") + "-bookmarks.pdf";

  return (
    <MarketingShell>
      <ToolShell
        tool={tool}
        options={
          <>
            <p className="text-xs text-zinc-500">
              Extract, edit, reorder, or generate a table of contents from
              heading-like text. Outline write-back is flat (depth is display
              only). 100% in-browser.
            </p>
            {note && <p className="text-xs text-foreground/70">{note}</p>}
            {pageCount > 0 && (
              <p className="text-xs text-zinc-500">{pageCount} pages</p>
            )}
            <Button
              className="w-full"
              variant="outline"
              disabled={!buf || busy}
              onClick={() => void generate()}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {busy ? "Working…" : "Generate from headings"}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              disabled={!buf || busy}
              onClick={add}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add bookmark
            </Button>
            <Button
              className="w-full"
              disabled={!buf || busy}
              onClick={() => void save()}
            >
              <ListTree className="mr-1.5 h-3.5 w-3.5" />
              {busy ? "Saving…" : "Apply & download"}
            </Button>
          </>
        }
      >
        <DropZone
          accept="application/pdf"
          onFiles={(fs) => void onFiles(fs)}
          label={file ? file.name : "Drop a PDF to manage bookmarks"}
        />

        {items.length > 0 && (
          <ul className="space-y-2 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-3 shadow-[var(--shadow-sm)]">
            {items.map((it, idx) => (
              <li
                key={it.id}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--bg)]/40 p-2 sm:flex-nowrap"
                )}
                style={{ marginLeft: Math.min(it.depth, 3) * 12 }}
              >
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    className="rounded p-0.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    aria-label="Move up"
                    disabled={idx === 0}
                    onClick={() => move(idx, -1)}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    aria-label="Move down"
                    disabled={idx === items.length - 1}
                    onClick={() => move(idx, 1)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="sr-only">Title</Label>
                  <Input
                    value={it.title}
                    onChange={(e) => update(it.id, { title: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="w-20 shrink-0">
                  <Label className="sr-only">Page</Label>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, pageCount)}
                    value={it.pageIndex + 1}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (Number.isNaN(n)) return;
                      update(it.id, {
                        pageIndex: Math.max(0, n - 1),
                      });
                    }}
                    className="h-9"
                    title="Page number"
                  />
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-600"
                  aria-label="Delete"
                  onClick={() => remove(it.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {!items.length && buf && (
          <p className="rounded-2xl border border-dashed border-[var(--hairline)] p-6 text-center text-sm text-zinc-500">
            Empty outline. Add bookmarks manually or generate from headings when
            a text layer exists.
          </p>
        )}

        {result && (
          <ResultBar
            fileName={outName}
            size={result.byteLength}
            meta={note}
            onDownload={() => downloadBytes(result, outName)}
          />
        )}
      </ToolShell>
    </MarketingShell>
  );
}
