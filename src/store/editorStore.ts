"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { v4 as uuid } from "uuid";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  DEFAULT_SETTINGS,
  type Annotation,
  type EditorSettings,
  type FormFieldValue,
  type PageMeta,
  type Tool,
  type ZoomMode,
} from "./types";
import { loadPdfDocument, getPageSizes } from "@/lib/pdf/loader";
import { listFormFields } from "@/lib/pdf/export";
import { saveRecentFile, loadSettings, saveSettings } from "@/lib/storage/recent";
import type { SearchMatch } from "@/lib/pdf/search";

interface HistorySnapshot {
  annotations: Annotation[];
  pages: PageMeta[];
  formValues: FormFieldValue[];
}

interface EditorState {
  // Document
  fileName: string | null;
  fileSize: number;
  pdfBytes: ArrayBuffer | null;
  pdfDoc: PDFDocumentProxy | null;
  pages: PageMeta[];
  annotations: Annotation[];
  formValues: FormFieldValue[];
  isLoading: boolean;
  loadError: string | null;

  // View
  currentPage: number;
  zoom: number;
  zoomMode: ZoomMode;
  tool: Tool;
  selectedIds: string[];
  isPanning: boolean;

  // Drawing draft
  draft: Partial<Annotation> | null;

  // Search
  searchQuery: string;
  searchMatches: SearchMatch[];
  searchIndex: number;

  // History
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // UI
  settings: EditorSettings;
  shortcutsOpen: boolean;
  settingsOpen: boolean;
  signatureOpen: boolean;
  stampLabel: string;

  // Actions
  initSettings: () => Promise<void>;
  updateSettings: (partial: Partial<EditorSettings>) => void;
  openFile: (file: File | { name: string; data: ArrayBuffer; size?: number }) => Promise<void>;
  closeDocument: () => void;
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number, mode?: ZoomMode) => void;
  setCurrentPage: (page: number) => void;
  selectAnnotations: (ids: string[]) => void;
  addAnnotation: (ann: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  deleteSelected: () => void;
  setDraft: (draft: Partial<Annotation> | null) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  rotatePage: (pageIndex: number, delta: number) => void;
  deletePage: (pageIndex: number) => void;
  reorderPages: (from: number, to: number) => void;
  insertBlankPage: (atIndex: number) => void;
  setFormValue: (name: string, value: string) => void;
  setSearch: (query: string, matches: SearchMatch[]) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  setStampLabel: (label: string) => void;
  setDialog: (key: "shortcutsOpen" | "settingsOpen" | "signatureOpen", open: boolean) => void;
  replacePdfBytes: (bytes: ArrayBuffer, fileName?: string) => Promise<void>;
}

function snapshot(s: {
  annotations: Annotation[];
  pages: PageMeta[];
  formValues: FormFieldValue[];
}): HistorySnapshot {
  // Must clone plain state (e.g. from get()), never immer drafts — structuredClone throws on Proxies.
  return {
    annotations: structuredClone(s.annotations),
    pages: structuredClone(s.pages),
    formValues: structuredClone(s.formValues),
  };
}

/** Map a point from pre-rotate display space to post-rotate (delta degrees CW). */
function rotatePoint(
  x: number,
  y: number,
  oldW: number,
  oldH: number,
  delta: number
): { x: number; y: number } {
  const d = ((delta % 360) + 360) % 360;
  if (d === 0) return { x, y };
  if (d === 90) return { x: oldH - y, y: x };
  if (d === 180) return { x: oldW - x, y: oldH - y };
  if (d === 270) return { x: y, y: oldW - x };
  return { x, y };
}

function transformAnnotationForRotation(ann: Annotation, oldW: number, oldH: number, delta: number): Annotation {
  const d = ((delta % 360) + 360) % 360;
  if (d === 0) return ann;

  const rotRect = (x: number, y: number, w: number, h: number) => {
    const c1 = rotatePoint(x, y, oldW, oldH, d);
    const c2 = rotatePoint(x + w, y, oldW, oldH, d);
    const c3 = rotatePoint(x, y + h, oldW, oldH, d);
    const c4 = rotatePoint(x + w, y + h, oldW, oldH, d);
    const xs = [c1.x, c2.x, c3.x, c4.x];
    const ys = [c1.y, c2.y, c3.y, c4.y];
    const nx = Math.min(...xs);
    const ny = Math.min(...ys);
    return { x: nx, y: ny, w: Math.max(...xs) - nx, h: Math.max(...ys) - ny };
  };

  switch (ann.type) {
    case "highlight":
    case "underline":
    case "strikethrough":
      return {
        ...ann,
        rects: ann.rects.map((r) => rotRect(r.x, r.y, r.w, r.h)),
      };
    case "pen":
      return {
        ...ann,
        points: ann.points.map((p) => rotatePoint(p.x, p.y, oldW, oldH, d)),
      };
    case "line":
    case "arrow": {
      const a = rotatePoint(ann.x, ann.y, oldW, oldH, d);
      const b = rotatePoint(ann.x + ann.w, ann.y + ann.h, oldW, oldH, d);
      return { ...ann, x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
    }
    case "note": {
      const p = rotatePoint(ann.x, ann.y, oldW, oldH, d);
      return { ...ann, x: p.x, y: p.y };
    }
    case "rect":
    case "ellipse":
    case "textbox":
    case "stamp":
    case "signature": {
      const r = rotRect(ann.x, ann.y, ann.w, ann.h);
      return { ...ann, ...r };
    }
    default:
      return ann;
  }
}

function remapFormPageIndex(formValues: FormFieldValue[], mapFn: (pi: number) => number | null): FormFieldValue[] {
  return formValues
    .map((f) => {
      const next = mapFn(f.pageIndex);
      if (next === null) return null;
      return { ...f, pageIndex: next };
    })
    .filter(Boolean) as FormFieldValue[];
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    fileName: null,
    fileSize: 0,
    pdfBytes: null,
    pdfDoc: null,
    pages: [],
    annotations: [],
    formValues: [],
    isLoading: false,
    loadError: null,
    currentPage: 0,
    zoom: 1,
    zoomMode: "fit-width",
    tool: "select",
    selectedIds: [],
    isPanning: false,
    draft: null,
    searchQuery: "",
    searchMatches: [],
    searchIndex: -1,
    past: [],
    future: [],
    settings: DEFAULT_SETTINGS,
    shortcutsOpen: false,
    settingsOpen: false,
    signatureOpen: false,
    stampLabel: "APPROVED",

    initSettings: async () => {
      const saved = await loadSettings<EditorSettings>("editor");
      if (saved) set({ settings: { ...DEFAULT_SETTINGS, ...saved } });
    },

    updateSettings: (partial) => {
      set((s) => {
        s.settings = { ...s.settings, ...partial };
      });
      void saveSettings("editor", get().settings);
    },

    openFile: async (file) => {
      set({ isLoading: true, loadError: null });
      try {
        const data =
          file instanceof File ? await file.arrayBuffer() : file.data;
        const name = file instanceof File ? file.name : file.name;
        const size = file instanceof File ? file.size : file.size ?? data.byteLength;
        const doc = await loadPdfDocument(data);
        const sizes = await getPageSizes(doc);
        const pages: PageMeta[] = sizes.map((sz, i) => ({
          id: uuid(),
          sourceIndex: i,
          rotation: 0,
          width: sz.width,
          height: sz.height,
        }));
        const formValues = await listFormFields(data);
        set({
          fileName: name,
          fileSize: size,
          pdfBytes: data.slice(0),
          pdfDoc: doc,
          pages,
          annotations: [],
          formValues,
          currentPage: 0,
          selectedIds: [],
          past: [],
          future: [],
          searchQuery: "",
          searchMatches: [],
          searchIndex: -1,
          isLoading: false,
          draft: null,
        });
        void saveRecentFile(
          {
            id: uuid(),
            name,
            size,
            pageCount: pages.length,
            lastOpened: Date.now(),
          },
          data.slice(0)
        );
      } catch (e) {
        set({
          isLoading: false,
          loadError: e instanceof Error ? e.message : "Failed to open PDF",
        });
      }
    },

    closeDocument: () => {
      const doc = get().pdfDoc;
      doc?.destroy();
      set({
        fileName: null,
        fileSize: 0,
        pdfBytes: null,
        pdfDoc: null,
        pages: [],
        annotations: [],
        formValues: [],
        currentPage: 0,
        selectedIds: [],
        past: [],
        future: [],
        draft: null,
        searchQuery: "",
        searchMatches: [],
        searchIndex: -1,
      });
    },

    setTool: (tool) =>
      set((s) => {
        s.tool = tool;
        s.selectedIds = tool === "select" ? s.selectedIds : [];
        s.draft = null;
        if (tool === "form") s.settings.showProperties = true;
      }),
    setZoom: (zoom, mode) =>
      set({ zoom: Math.min(4, Math.max(0.25, zoom)), zoomMode: mode ?? "percent" }),
    setCurrentPage: (page) => {
      const max = Math.max(0, get().pages.length - 1);
      set({ currentPage: Math.min(max, Math.max(0, page)) });
    },
    selectAnnotations: (ids) => set({ selectedIds: ids }),

    addAnnotation: (ann) => {
      get().pushHistory();
      set((s) => {
        s.annotations.push(ann as Annotation);
        s.selectedIds = [ann.id];
        s.draft = null;
      });
    },

    updateAnnotation: (id, patch) => {
      set((s) => {
        const idx = s.annotations.findIndex((a) => a.id === id);
        if (idx >= 0) {
          s.annotations[idx] = { ...s.annotations[idx], ...patch } as Annotation;
        }
      });
    },

    deleteSelected: () => {
      const ids = get().selectedIds;
      if (!ids.length) return;
      get().pushHistory();
      set((s) => {
        s.annotations = s.annotations.filter((a) => !ids.includes(a.id));
        s.selectedIds = [];
      });
    },

    setDraft: (draft) => set({ draft }),

    pushHistory: () => {
      // Snapshot via get() — plain objects — not the immer draft inside set().
      const snap = snapshot(get());
      set((s) => {
        s.past.push(snap);
        if (s.past.length > 50) s.past.shift();
        s.future = [];
      });
    },

    undo: () => {
      const state = get();
      if (!state.past.length) return;
      const currentSnap = snapshot(state);
      set((s) => {
        s.future.push(currentSnap);
        const prev = s.past.pop()!;
        s.annotations = prev.annotations;
        s.pages = prev.pages;
        s.formValues = prev.formValues;
        s.selectedIds = [];
      });
    },

    redo: () => {
      const state = get();
      if (!state.future.length) return;
      const currentSnap = snapshot(state);
      set((s) => {
        s.past.push(currentSnap);
        const next = s.future.pop()!;
        s.annotations = next.annotations;
        s.pages = next.pages;
        s.formValues = next.formValues;
        s.selectedIds = [];
      });
    },

    rotatePage: (pageIndex, delta) => {
      get().pushHistory();
      set((s) => {
        const p = s.pages[pageIndex];
        if (!p) return;
        const oldW = p.width;
        const oldH = p.height;
        const d = ((delta % 360) + 360) % 360;
        p.rotation = (p.rotation + d) % 360;
        if (d % 180 !== 0) {
          p.width = oldH;
          p.height = oldW;
        }
        s.annotations = s.annotations.map((a) =>
          a.pageIndex === pageIndex
            ? transformAnnotationForRotation(a, oldW, oldH, d)
            : a
        );
      });
    },

    deletePage: (pageIndex) => {
      if (get().pages.length <= 1) return;
      get().pushHistory();
      set((s) => {
        s.pages.splice(pageIndex, 1);
        s.annotations = s.annotations
          .filter((a) => a.pageIndex !== pageIndex)
          .map((a) =>
            a.pageIndex > pageIndex ? { ...a, pageIndex: a.pageIndex - 1 } : a
          );
        s.formValues = remapFormPageIndex(s.formValues, (pi) => {
          if (pi === pageIndex) return null;
          if (pi > pageIndex) return pi - 1;
          return pi;
        });
        s.currentPage = Math.min(s.currentPage, s.pages.length - 1);
      });
    },

    reorderPages: (from, to) => {
      if (from === to) return;
      get().pushHistory();
      set((s) => {
        const [moved] = s.pages.splice(from, 1);
        s.pages.splice(to, 0, moved);
        const mapPi = (pi: number) => {
          if (pi === from) return to;
          if (from < to && pi > from && pi <= to) return pi - 1;
          if (from > to && pi >= to && pi < from) return pi + 1;
          return pi;
        };
        s.annotations = s.annotations.map((a) => ({
          ...a,
          pageIndex: mapPi(a.pageIndex),
        }));
        s.formValues = s.formValues.map((f) => ({
          ...f,
          pageIndex: mapPi(f.pageIndex),
        }));
        s.currentPage = to;
      });
    },

    insertBlankPage: (atIndex) => {
      get().pushHistory();
      set((s) => {
        const ref = s.pages[Math.max(0, atIndex - 1)] || s.pages[0];
        const blank: PageMeta = {
          id: uuid(),
          sourceIndex: -1,
          rotation: 0,
          width: ref?.width || 612,
          height: ref?.height || 792,
        };
        s.pages.splice(atIndex, 0, blank);
        s.annotations = s.annotations.map((a) =>
          a.pageIndex >= atIndex ? { ...a, pageIndex: a.pageIndex + 1 } : a
        );
        s.formValues = s.formValues.map((f) =>
          f.pageIndex >= atIndex ? { ...f, pageIndex: f.pageIndex + 1 } : f
        );
        s.currentPage = atIndex;
      });
    },

    setFormValue: (name, value) => {
      set((s) => {
        const f = s.formValues.find((x) => x.name === name);
        if (f) f.value = value;
      });
    },

    setSearch: (query, matches) => {
      const pages = get().pages;
      // searchPdf returns source PDF page indices; map onto current pages[].
      const remapped = matches
        .map((m) => {
          const idx = pages.findIndex((p) => p.sourceIndex === m.pageIndex);
          if (idx < 0) return null;
          return { ...m, pageIndex: idx };
        })
        .filter(Boolean) as typeof matches;
      set({
        searchQuery: query,
        searchMatches: remapped,
        searchIndex: remapped.length ? 0 : -1,
        currentPage: remapped.length ? remapped[0].pageIndex : get().currentPage,
      });
    },

    nextMatch: () => {
      const { searchMatches, searchIndex } = get();
      if (!searchMatches.length) return;
      const next = (searchIndex + 1) % searchMatches.length;
      set({ searchIndex: next, currentPage: searchMatches[next].pageIndex });
    },

    prevMatch: () => {
      const { searchMatches, searchIndex } = get();
      if (!searchMatches.length) return;
      const prev = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
      set({ searchIndex: prev, currentPage: searchMatches[prev].pageIndex });
    },

    setStampLabel: (label) => set({ stampLabel: label }),
    setDialog: (key, open) => set({ [key]: open }),

    replacePdfBytes: async (bytes, fileName) => {
      set({ isLoading: true });
      try {
        const doc = await loadPdfDocument(bytes);
        const sizes = await getPageSizes(doc);
        const pages: PageMeta[] = sizes.map((sz, i) => ({
          id: uuid(),
          sourceIndex: i,
          rotation: 0,
          width: sz.width,
          height: sz.height,
        }));
        const formValues = await listFormFields(bytes);
        set({
          pdfBytes: bytes.slice(0),
          pdfDoc: doc,
          pages,
          annotations: [],
          formValues,
          fileName: fileName ?? get().fileName,
          fileSize: bytes.byteLength,
          currentPage: 0,
          past: [],
          future: [],
          selectedIds: [],
          isLoading: false,
        });
      } catch (e) {
        set({
          isLoading: false,
          loadError: e instanceof Error ? e.message : "Failed to reload PDF",
        });
      }
    },
  }))
);
