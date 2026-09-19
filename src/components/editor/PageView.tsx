"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { useEditorStore } from "@/store/editorStore";
import { AnnotationLayer } from "./AnnotationLayer";
import type { Annotation, Tool } from "@/store/types";
import { cn } from "@/lib/utils";
import {
  TEXT_MARKUP_TOOLS,
  clearDomSelection,
  renderTextLayer,
  selectionToPageRects,
} from "@/lib/pdf/textLayer";

interface Props {
  pageIndex: number;
  scale: number;
}

function toolToAnnType(tool: Tool): Annotation["type"] | null {
  const map: Partial<Record<Tool, Annotation["type"]>> = {
    highlight: "highlight",
    underline: "underline",
    strikethrough: "strikethrough",
    pen: "pen",
    note: "note",
    textbox: "textbox",
    rect: "rect",
    ellipse: "ellipse",
    arrow: "arrow",
    line: "line",
    stamp: "stamp",
    signature: "signature",
  };
  return map[tool] ?? null;
}

function cursorForTool(tool: Tool): string {
  switch (tool) {
    case "pan":
      return "cursor-grab active:cursor-grabbing";
    case "select":
      return "cursor-default";
    case "highlight":
    case "underline":
    case "strikethrough":
      return "cursor-text";
    case "form":
      return "cursor-text";
    default:
      return "cursor-crosshair";
  }
}

const MARKUP_SET = new Set(["highlight", "underline", "strikethrough"]);

export function PageView({ pageIndex, scale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const textLayerCleanup = useRef<(() => void) | null>(null);
  const pdfDoc = useEditorStore((s) => s.pdfDoc);
  const pages = useEditorStore((s) => s.pages);
  const tool = useEditorStore((s) => s.tool);
  const settings = useEditorStore((s) => s.settings);
  const stampLabel = useEditorStore((s) => s.stampLabel);
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const setDraft = useEditorStore((s) => s.setDraft);
  const selectAnnotations = useEditorStore((s) => s.selectAnnotations);
  const searchMatches = useEditorStore((s) => s.searchMatches);
  const searchIndex = useEditorStore((s) => s.searchIndex);
  const setDialog = useEditorStore((s) => s.setDialog);
  const page = pages[pageIndex];
  const [rendering, setRendering] = useState(true);
  const drawing = useRef<{
    startX: number;
    startY: number;
    points?: { x: number; y: number }[];
    id: string;
    /** True when drag-rect fallback for markup (no text selection) */
    freeMarkup?: boolean;
  } | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const selectingText = useRef(false);

  const rotation = page?.rotation || 0;
  const baseW = page?.width || 612;
  const baseH = page?.height || 792;
  const wantsTextLayer =
    TEXT_MARKUP_TOOLS.has(tool) || searchMatches.some((m) => m.pageIndex === pageIndex);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!pdfDoc || !page || !canvasRef.current) return;
      setRendering(true);
      try {
        renderTaskRef.current?.cancel();
        renderTaskRef.current = null;
        textLayerCleanup.current?.();
        textLayerCleanup.current = null;

        if (page.sourceIndex < 0) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d")!;
          canvas.width = Math.max(1, Math.floor(baseW * scale));
          canvas.height = Math.max(1, Math.floor(baseH * scale));
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "#e5e5e5";
          ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
          if (!cancelled) setRendering(false);
          return;
        }
        const pdfPage = await pdfDoc.getPage(page.sourceIndex + 1);
        const viewport = pdfPage.getViewport({
          scale,
          rotation: rotation % 360,
        });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const task = pdfPage.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;

        if (
          !cancelled &&
          wantsTextLayer &&
          textLayerRef.current
        ) {
          const cleanup = await renderTextLayer({
            page: pdfPage,
            container: textLayerRef.current,
            viewport: {
              width: viewport.width,
              height: viewport.height,
              scale,
              rotation: rotation % 360,
              clone: viewport.clone.bind(viewport),
            },
            rawViewport: viewport,
          });
          if (cancelled) {
            cleanup.cancel();
          } else {
            textLayerCleanup.current = cleanup.cancel;
          }
        }

        if (!cancelled) setRendering(false);
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name: string }).name === "RenderingCancelledException"
        ) {
          return;
        }
        if (!cancelled) setRendering(false);
      }
    }
    void render();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      textLayerCleanup.current?.();
      textLayerCleanup.current = null;
    };
  }, [pdfDoc, page, pageIndex, scale, rotation, baseW, baseH, wantsTextLayer]);

  const toPagePoint = useCallback(
    (e: React.PointerEvent | PointerEvent | MouseEvent) => {
      const el = containerRef.current!;
      const rect = el.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  const commitMarkupFromSelection = useCallback(() => {
    if (!MARKUP_SET.has(tool) || !textLayerRef.current) return false;
    const mapped = selectionToPageRects(textLayerRef.current, scale);
    if (!mapped || mapped.rects.length === 0) return false;

    const annType = tool as "highlight" | "underline" | "strikethrough";
    addAnnotation({
      id: uuid(),
      pageIndex,
      type: annType,
      color: settings.defaultColor,
      opacity:
        annType === "highlight" ? settings.defaultOpacity : 0.9,
      strokeWidth: settings.defaultStrokeWidth,
      createdAt: Date.now(),
      rects: mapped.rects,
      text: mapped.text,
    });
    clearDomSelection();
    return true;
  }, [tool, scale, pageIndex, addAnnotation, settings]);

  // mouseup on document to catch text selection ending inside text layer
  useEffect(() => {
    if (!MARKUP_SET.has(tool)) return;
    const onUp = () => {
      if (!selectingText.current) return;
      selectingText.current = false;
      // Defer so selection is finalized
      requestAnimationFrame(() => {
        const ok = commitMarkupFromSelection();
        if (!ok && drawing.current?.freeMarkup) {
          // handled by pointer up free path
        }
      });
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [tool, commitMarkupFromSelection]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (tool === "pan" || tool === "form") return;

    // Text layer handles its own selection for markup tools
    const onTextLayer =
      textLayerRef.current &&
      (e.target === textLayerRef.current ||
        textLayerRef.current.contains(e.target as Node));

    if (tool === "select") {
      if (!onTextLayer) selectAnnotations([]);
      return;
    }

    if (MARKUP_SET.has(tool) && onTextLayer) {
      selectingText.current = true;
      // Don't start drag-rect yet — wait for mouseup selection
      // Also arm a free-drag fallback if user drags without selecting text
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = toPagePoint(e);
      const id = uuid();
      drawing.current = {
        startX: p.x,
        startY: p.y,
        id,
        freeMarkup: true,
      };
      return;
    }

    if (tool === "signature") {
      const p = toPagePoint(e);
      setDraft({
        id: uuid(),
        type: "signature",
        pageIndex,
        x: p.x - 90,
        y: p.y - 30,
        w: 180,
        h: 60,
        color: settings.defaultColor,
        opacity: 1,
        strokeWidth: 2,
        createdAt: Date.now(),
      });
      setDialog("signatureOpen", true);
      return;
    }

    const annType = toolToAnnType(tool);
    if (!annType) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPagePoint(e);
    const id = uuid();
    drawing.current = { startX: p.x, startY: p.y, id, points: [{ ...p }] };

    const base = {
      id,
      pageIndex,
      color: settings.defaultColor,
      opacity:
        annType === "highlight"
          ? settings.defaultOpacity
          : annType === "pen"
            ? 1
            : 0.35,
      strokeWidth: settings.defaultStrokeWidth,
      createdAt: Date.now(),
    };

    if (annType === "pen") {
      setDraft({ ...base, type: "pen", points: [{ ...p }] });
    } else if (annType === "note") {
      const text = window.prompt("Note text", "Note");
      if (text === null) {
        drawing.current = null;
        return;
      }
      addAnnotation({
        ...base,
        type: "note",
        x: p.x,
        y: p.y,
        text: text || "Note",
        opacity: 1,
      });
      drawing.current = null;
    } else if (annType === "stamp") {
      addAnnotation({
        ...base,
        type: "stamp",
        x: p.x - 60,
        y: p.y - 20,
        w: 120,
        h: 40,
        label: stampLabel,
        opacity: 0.9,
        color: "#DC2626",
      });
      drawing.current = null;
    } else if (
      annType === "highlight" ||
      annType === "underline" ||
      annType === "strikethrough"
    ) {
      // Drag-rect fallback (no text layer / scanned)
      drawing.current.freeMarkup = true;
      setDraft({
        ...base,
        type: annType,
        rects: [{ x: p.x, y: p.y - 8, w: 0, h: 16 }],
      });
    } else if (annType === "textbox") {
      setDraft({
        ...base,
        type: "textbox",
        x: p.x,
        y: p.y,
        w: 0,
        h: 0,
        text: "Text",
        fontSize: 14,
        fontFamily: "Helvetica, sans-serif",
        opacity: 1,
      });
    } else {
      setDraft({
        ...base,
        type: annType,
        x: p.x,
        y: p.y,
        w: 0,
        h: 0,
        filled: false,
        fillColor: settings.defaultColor,
        opacity: 1,
      } as Partial<Annotation>);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = toPagePoint(e);
    const { startX, startY, id, freeMarkup } = drawing.current;

    // For markup on text layer: only show free draft after meaningful drag
    // without an active text selection
    if (MARKUP_SET.has(tool) && freeMarkup) {
      const dist = Math.hypot(p.x - startX, p.y - startY);
      const sel = window.getSelection();
      const hasTextSel = sel && !sel.isCollapsed && sel.toString().trim();
      if (hasTextSel) {
        // Prefer text selection — clear any free draft
        setDraft(null);
        return;
      }
      if (dist < 6) return;
      const d = useEditorStore.getState().draft;
      const annType = tool as "highlight" | "underline" | "strikethrough";
      const x = Math.min(startX, p.x);
      const w = Math.abs(p.x - startX);
      const y = Math.min(startY, p.y) - 2;
      const h = Math.max(14, Math.abs(p.y - startY) + 4);
      if (!d || d.id !== id) {
        setDraft({
          id,
          pageIndex,
          type: annType,
          color: settings.defaultColor,
          opacity:
            annType === "highlight" ? settings.defaultOpacity : 0.9,
          strokeWidth: settings.defaultStrokeWidth,
          createdAt: Date.now(),
          rects: [{ x, y, w, h }],
        });
      } else {
        setDraft({ ...d, rects: [{ x, y, w, h }] });
      }
      return;
    }

    const d = useEditorStore.getState().draft;
    if (!d || d.id !== id) return;

    if (d.type === "pen") {
      const pts = [...(drawing.current.points || []), p];
      drawing.current.points = pts;
      setDraft({ ...d, points: pts });
    } else if (
      d.type === "highlight" ||
      d.type === "underline" ||
      d.type === "strikethrough"
    ) {
      const x = Math.min(startX, p.x);
      const w = Math.abs(p.x - startX);
      setDraft({
        ...d,
        rects: [{ x, y: startY - 8, w, h: 16 }],
      });
    } else if (
      d.type === "rect" ||
      d.type === "ellipse" ||
      d.type === "textbox" ||
      d.type === "line" ||
      d.type === "arrow"
    ) {
      setDraft({
        ...d,
        x: startX,
        y: startY,
        w: p.x - startX,
        h: p.y - startY,
      });
    }
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    const wasFree = drawing.current.freeMarkup;
    const d = useEditorStore.getState().draft;
    drawing.current = null;

    // Text-select markup takes priority
    if (MARKUP_SET.has(tool)) {
      const fromSel = commitMarkupFromSelection();
      if (fromSel) {
        setDraft(null);
        return;
      }
      // Fall through to free-rect if we drew one
      if (wasFree && d && MARKUP_SET.has(d.type || "")) {
        const w = (d as { rects?: { w: number }[] }).rects?.[0]?.w ?? 0;
        if (w >= 4) {
          try {
            addAnnotation(d as Annotation);
            const kind = d.type === "underline" ? "underline" : d.type === "strikethrough" ? "strikethrough" : "highlight";
            toast.message(`No text here — drew a free ${kind}`);
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Could not add annotation"
            );
            setDraft(null);
          }
          return;
        }
      }
      setDraft(null);
      return;
    }

    if (!d || !d.type) {
      setDraft(null);
      return;
    }

    const tooSmallShape =
      (d.type === "rect" ||
        d.type === "ellipse" ||
        d.type === "textbox") &&
      "w" in d &&
      "h" in d &&
      Math.abs((d as { w: number }).w) < 4 &&
      Math.abs((d as { h: number }).h) < 4;

    const tooSmallMarkup =
      (d.type === "highlight" ||
        d.type === "underline" ||
        d.type === "strikethrough") &&
      "rects" in d &&
      ((d as { rects: { w: number }[] }).rects?.[0]?.w ?? 0) < 4;

    const tooSmallLine =
      (d.type === "line" || d.type === "arrow") &&
      "w" in d &&
      "h" in d &&
      Math.hypot((d as { w: number }).w, (d as { h: number }).h) < 4;

    if (tooSmallShape || tooSmallMarkup || tooSmallLine) {
      setDraft(null);
      return;
    }
    if (d.type === "pen" && (!d.points || d.points.length < 2)) {
      setDraft(null);
      return;
    }
    if (d.type === "textbox") {
      const tw = Math.abs((d as { w: number }).w);
      const th = Math.abs((d as { h: number }).h);
      const nx = Math.min(
        (d as { x: number }).x,
        (d as { x: number }).x + (d as { w: number }).w
      );
      const ny = Math.min(
        (d as { y: number }).y,
        (d as { y: number }).y + (d as { h: number }).h
      );
      const text = window.prompt(
        "Enter text",
        (d as { text?: string }).text || "Text"
      );
      if (text === null) {
        setDraft(null);
        return;
      }
      addAnnotation({
        ...(d as Annotation),
        x: nx,
        y: ny,
        w: Math.max(tw, 40),
        h: Math.max(th, 24),
        text: text || "Text",
      } as Annotation);
      return;
    }

    if (d.type === "rect" || d.type === "ellipse") {
      const x = Math.min(
        (d as { x: number }).x,
        (d as { x: number }).x + (d as { w: number }).w
      );
      const y = Math.min(
        (d as { y: number }).y,
        (d as { y: number }).y + (d as { h: number }).h
      );
      const w = Math.abs((d as { w: number }).w);
      const h = Math.abs((d as { h: number }).h);
      try {
        addAnnotation({ ...(d as Annotation), x, y, w, h } as Annotation);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not add annotation"
        );
        setDraft(null);
      }
      return;
    }

    try {
      addAnnotation(d as Annotation);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not add annotation"
      );
      setDraft(null);
    }
  };

  if (!page) return null;

  const cssW = page.width * scale;
  const cssH = page.height * scale;

  const pageHits = searchMatches
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.pageIndex === pageIndex);

  const markupActive = MARKUP_SET.has(tool) || tool === "select";
  // Drawing tools: overlay captures events; text layer must not steal them
  const drawingTool = !TEXT_MARKUP_TOOLS.has(tool);

  return (
    <div
      ref={containerRef}
      id={`page-${pageIndex}`}
      className={cn(
        "relative mx-auto mb-6 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.35)] ring-1 ring-black/10",
        cursorForTool(tool)
      )}
      style={{ width: cssW, height: cssH }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: cssW, height: cssH }}
      />
      {rendering && (
        <div className="absolute inset-0 animate-pulse bg-zinc-200/40" />
      )}
      {/* Selectable text layer */}
      <div
        ref={textLayerRef}
        className={cn(
          "textLayer absolute inset-0",
          markupActive && !drawingTool ? "markup-active" : "markup-inactive"
        )}
        style={{ width: cssW, height: cssH }}
        aria-hidden={!markupActive}
      />
      {/* All search hits on this page */}
      {pageHits.map(({ m, i }) =>
        m.rects.map((r, ri) => (
          <div
            key={`${i}-${ri}`}
            className={cn("page-search-hit", i === searchIndex && "current")}
            style={{
              left: r.x * scale,
              top: r.y * scale,
              width: r.w * scale,
              height: r.h * scale,
            }}
          />
        ))
      )}
      <AnnotationLayer
        pageIndex={pageIndex}
        scale={scale}
        width={cssW}
        height={cssH}
      />
      {/* Drawing overlay: captures events for pen/shapes; passes through for markup */}
      {drawingTool && tool !== "select" && tool !== "pan" && tool !== "form" && (
        <div className="absolute inset-0 z-20" style={{ pointerEvents: "none" }} />
      )}
      <div className="pointer-events-none absolute bottom-2 right-2 z-30 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
        {pageIndex + 1}
      </div>
    </div>
  );
}
