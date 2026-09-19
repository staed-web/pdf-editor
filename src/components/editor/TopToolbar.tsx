"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileUp,
  Download,
  Printer,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Trash2,
  FilePlus,
  Combine,
  Scissors,
  Settings,
  Keyboard,
  X,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/store/editorStore";
import { exportEditedPdf, mergePdfs, extractPages } from "@/lib/pdf/export";
import { searchPdf } from "@/lib/pdf/search";
import { downloadBlob, cn } from "@/lib/utils";
import { useThemeStore } from "@/lib/theme/theme-store";

export function TopToolbar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener("ipe:open-search", open);
    return () => window.removeEventListener("ipe:open-search", open);
  }, []);

  const fileName = useEditorStore((s) => s.fileName);
  const pdfBytes = useEditorStore((s) => s.pdfBytes);
  const pdfDoc = useEditorStore((s) => s.pdfDoc);
  const pages = useEditorStore((s) => s.pages);
  const annotations = useEditorStore((s) => s.annotations);
  const formValues = useEditorStore((s) => s.formValues);
  const settings = useEditorStore((s) => s.settings);
  const currentPage = useEditorStore((s) => s.currentPage);
  const zoom = useEditorStore((s) => s.zoom);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const searchMatches = useEditorStore((s) => s.searchMatches);
  const searchIndex = useEditorStore((s) => s.searchIndex);
  const openFile = useEditorStore((s) => s.openFile);
  const closeDocument = useEditorStore((s) => s.closeDocument);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const rotatePage = useEditorStore((s) => s.rotatePage);
  const deletePage = useEditorStore((s) => s.deletePage);
  const insertBlankPage = useEditorStore((s) => s.insertBlankPage);
  const setSearch = useEditorStore((s) => s.setSearch);
  const nextMatch = useEditorStore((s) => s.nextMatch);
  const prevMatch = useEditorStore((s) => s.prevMatch);
  const setDialog = useEditorStore((s) => s.setDialog);
  const replacePdfBytes = useEditorStore((s) => s.replacePdfBytes);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const selectedIds = useEditorStore((s) => s.selectedIds);

  const onExport = async () => {
    if (!pdfBytes) return;
    setExporting(true);
    try {
      const bytes = await exportEditedPdf({
        sourceBytes: pdfBytes,
        pages,
        annotations,
        formValues,
        flattenForms: settings.flattenFormsOnExport,
      });
      const name = (fileName || "document").replace(/\.pdf$/i, "") + "-edited.pdf";
      downloadBlob(bytes, name);
      toast.success("PDF exported");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const onPrint = async () => {
    if (!pdfBytes) return;
    try {
      const bytes = await exportEditedPdf({
        sourceBytes: pdfBytes,
        pages,
        annotations,
        formValues,
        flattenForms: settings.flattenFormsOnExport,
      });
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const w = window.open(url);
      w?.addEventListener("load", () => {
        w.print();
      });
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("Print prep failed");
    }
  };

  const onSearch = async () => {
    if (!pdfDoc || !searchInput.trim()) return;
    const matches = await searchPdf(pdfDoc, searchInput);
    setSearch(searchInput, matches);
    toast.message(
      matches.length ? `${matches.length} match${matches.length === 1 ? "" : "es"}` : "No matches"
    );
  };

  const onMerge = async (file: File) => {
    if (!pdfBytes) return;
    try {
      const other = await file.arrayBuffer();
      const merged = await mergePdfs(pdfBytes, other);
      const ab = new Uint8Array(merged).buffer;
      await replacePdfBytes(ab, fileName || "merged.pdf");
      toast.success(`Merged ${file.name}`);
    } catch {
      toast.error("Merge failed");
    }
  };

  const onExtract = async () => {
    if (!pdfBytes) return;
    try {
      const indices = pages
        .map((p, i) => (p.sourceIndex >= 0 ? { i, src: p.sourceIndex } : null))
        .filter(Boolean) as { i: number; src: number }[];
      // Extract current page only as split example
      const page = pages[currentPage];
      if (page.sourceIndex < 0) {
        toast.error("Cannot extract a blank page");
        return;
      }
      const bytes = await extractPages(pdfBytes, [page.sourceIndex]);
      downloadBlob(bytes, `page-${currentPage + 1}.pdf`);
      toast.success(`Extracted page ${currentPage + 1}`);
      void indices;
    } catch {
      toast.error("Extract failed");
    }
  };

  const themeMode = useThemeStore((s) => s.mode);
  const cycleTheme = useThemeStore((s) => s.cycle);

  return (
    <TooltipProvider delayDuration={200}>
      <header className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto overscroll-x-contain border-b border-[var(--border)] bg-[var(--card)]/95 px-2 backdrop-blur no-scrollbar safe-px">
        <div className="flex items-center gap-1.5 pr-2">
          <a href="/" className="flex items-center gap-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/20">
              <span className="text-xs font-black text-zinc-950">I</span>
            </div>
            <div className="hidden min-w-0 flex-col sm:flex">
              <span className="text-[11px] font-semibold tracking-wide text-amber-600 dark:text-amber-400/90">
                InstantPDFEdit
              </span>
              <span className="max-w-[180px] truncate text-xs text-zinc-500 dark:text-zinc-300">
                {fileName || "PDF Editor"}
              </span>
            </div>
          </a>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn tip="Open PDF" onClick={() => fileRef.current?.click()}>
          <FileUp />
        </ToolBtn>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void openFile(f);
            e.target.value = "";
          }}
        />
        <ToolBtn tip="Export" disabled={!pdfBytes || exporting} onClick={() => void onExport()}>
          <Download />
        </ToolBtn>
        <ToolBtn tip="Print" disabled={!pdfBytes} onClick={() => void onPrint()}>
          <Printer />
        </ToolBtn>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn tip="Undo (⌘Z)" disabled={!past.length} onClick={undo}>
          <Undo2 />
        </ToolBtn>
        <ToolBtn tip="Redo (⌘⇧Z)" disabled={!future.length} onClick={redo}>
          <Redo2 />
        </ToolBtn>
        <ToolBtn
          tip="Delete selected"
          disabled={!selectedIds.length}
          onClick={deleteSelected}
        >
          <Trash2 />
        </ToolBtn>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn tip="Zoom out" onClick={() => setZoom(zoom / 1.15)}>
          <ZoomOut />
        </ToolBtn>
        <button
          className="min-w-[52px] rounded-md px-1.5 py-1 text-xs tabular-nums text-zinc-300 hover:bg-zinc-800"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <ToolBtn tip="Zoom in" onClick={() => setZoom(zoom * 1.15)}>
          <ZoomIn />
        </ToolBtn>
        <ToolBtn tip="Fit width" onClick={() => setZoom(zoom, "fit-width")}>
          <Maximize2 />
        </ToolBtn>
        <ToolBtn tip="Fit page" onClick={() => setZoom(zoom, "fit-page")}>
          <Maximize2 className="rotate-90" />
        </ToolBtn>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn
          tip="Previous page"
          disabled={currentPage <= 0}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <ChevronLeft />
        </ToolBtn>
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <Input
            className="h-7 w-12 px-1 text-center"
            value={pages.length ? currentPage + 1 : 0}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) setCurrentPage(n - 1);
            }}
          />
          <span>/ {pages.length || 0}</span>
        </div>
        <ToolBtn
          tip="Next page"
          disabled={currentPage >= pages.length - 1}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          <ChevronRight />
        </ToolBtn>

<div className="hidden items-center gap-1 md:flex">
        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn tip="Rotate page" disabled={!pages.length} onClick={() => rotatePage(currentPage, 90)}>
          <RotateCw />
        </ToolBtn>
        <ToolBtn tip="Delete page" disabled={pages.length <= 1} onClick={() => deletePage(currentPage)}>
          <Trash2 />
        </ToolBtn>
        <ToolBtn tip="Insert blank" disabled={!pages.length} onClick={() => insertBlankPage(currentPage + 1)}>
          <FilePlus />
        </ToolBtn>
        <ToolBtn tip="Merge PDF" disabled={!pdfBytes} onClick={() => mergeRef.current?.click()}>
          <Combine />
        </ToolBtn>
        <input
          ref={mergeRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onMerge(f);
            e.target.value = "";
          }}
        />
        <ToolBtn tip="Extract page" disabled={!pdfBytes} onClick={() => void onExtract()}>
          <Scissors />
        </ToolBtn>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {searchOpen ? (
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
              <input
                autoFocus
                className="h-7 w-36 bg-transparent text-xs text-foreground outline-none"
                placeholder="Search text…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void onSearch();
                  if (e.key === "Escape") setSearchOpen(false);
                }}
              />
              {searchMatches.length > 0 && (
                <span className="whitespace-nowrap text-[10px] text-zinc-500">
                  {searchIndex + 1}/{searchMatches.length}
                </span>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMatch}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMatch}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setSearchOpen(false);
                  setSearch("", []);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <ToolBtn tip="Search (⌘F)" onClick={() => setSearchOpen(true)}>
              <Search />
            </ToolBtn>
          )}
          <ToolBtn tip="Shortcuts" onClick={() => setDialog("shortcutsOpen", true)}>
            <Keyboard />
          </ToolBtn>
          <ToolBtn tip={`Theme: ${themeMode}`} onClick={cycleTheme}>
            {themeMode === "light" ? <Sun /> : themeMode === "dark" ? <Moon /> : <Monitor />}
          </ToolBtn>
          <ToolBtn tip="Settings" onClick={() => setDialog("settingsOpen", true)}>
            <Settings />
          </ToolBtn>
          {fileName && (
            <ToolBtn tip="Close" onClick={closeDocument}>
              <X />
            </ToolBtn>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}

function ToolBtn({
  tip,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-[var(--muted)] hover:text-foreground", className)} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
