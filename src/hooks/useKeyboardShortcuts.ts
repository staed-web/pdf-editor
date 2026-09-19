"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/store/editorStore";
import { exportEditedPdf } from "@/lib/pdf/export";
import { downloadBlob } from "@/lib/utils";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const mod = e.metaKey || e.ctrlKey;
      const s = useEditorStore.getState();

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        // Focus search via custom event
        window.dispatchEvent(new CustomEvent("ipe:open-search"));
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void (async () => {
          if (!s.pdfBytes) return;
          try {
            const bytes = await exportEditedPdf({
              sourceBytes: s.pdfBytes,
              pages: s.pages,
              annotations: s.annotations,
              formValues: s.formValues,
              flattenForms: s.settings.flattenFormsOnExport,
            });
            const name =
              (s.fileName || "document").replace(/\.pdf$/i, "") + "-edited.pdf";
            downloadBlob(bytes, name);
            toast.success("PDF exported");
          } catch {
            toast.error("Export failed");
          }
        })();
        return;
      }

      if (typing) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (s.selectedIds.length) {
          e.preventDefault();
          s.deleteSelected();
        }
        return;
      }

      const toolMap: Record<string, Parameters<typeof s.setTool>[0]> = {
        v: "select",
        h: "pan",
        m: "highlight",
        p: "pen",
        t: "textbox",
        n: "note",
        r: "rect",
        o: "ellipse",
        l: "line",
        s: "signature",
      };
      const k = e.key.toLowerCase();
      if (!mod && toolMap[k]) {
        e.preventDefault();
        s.setTool(toolMap[k]);
        return;
      }
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        s.setZoom(s.zoom * 1.15);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        s.setZoom(s.zoom / 1.15);
      } else if (e.key === "0") {
        e.preventDefault();
        s.setZoom(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        s.setCurrentPage(s.currentPage - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        s.setCurrentPage(s.currentPage + 1);
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        s.setDialog("shortcutsOpen", true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
