"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { useEditorStore } from "@/store/editorStore";
import { AnnotationLayer } from "./AnnotationLayer";
import type { Annotation, Tool } from "@/store/types";
import { cn } from "@/lib/utils";

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
    case "form":
      return "cursor-text";
    default:
      return "cursor-crosshair";
  }
}

export function PageView({ pageIndex, scale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
  } | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const rotation = page?.rotation || 0;
  const baseW = page?.width || 612;
  const baseH = page?.height || 792;

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!pdfDoc || !page || !canvasRef.current) return;
      setRendering(true);
      try {
        renderTaskRef.current?.cancel();
        renderTaskRef.current = null;
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
    };
  }, [pdfDoc, page, pageIndex, scale, rotation, baseW, baseH]);

  const toPagePoint = useCallback(
    (e: React.PointerEvent) => {
      const el = containerRef.current!;
      const rect = el.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (tool === "pan" || tool === "form") return;
    if (tool === "select") {
      // Clear selection when clicking empty page (annotation layer stops propagation).
      selectAnnotations([]);
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
    const { startX, startY, id } = drawing.current;
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
    const d = useEditorStore.getState().draft;
    drawing.current = null;
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
      const nx = Math.min((d as { x: number }).x, (d as { x: number }).x + (d as { w: number }).w);
      const ny = Math.min((d as { y: number }).y, (d as { y: number }).y + (d as { h: number }).h);
      const text = window.prompt("Enter text", (d as { text?: string }).text || "Text");
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

    // Normalize negative width/height for box-like shapes
    if (
      d.type === "rect" ||
      d.type === "ellipse"
    ) {
      const x = Math.min((d as { x: number }).x, (d as { x: number }).x + (d as { w: number }).w);
      const y = Math.min((d as { y: number }).y, (d as { y: number }).y + (d as { h: number }).h);
      const w = Math.abs((d as { w: number }).w);
      const h = Math.abs((d as { h: number }).h);
      try {
        addAnnotation({ ...(d as Annotation), x, y, w, h } as Annotation);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add annotation");
        setDraft(null);
      }
      return;
    }

    try {
      addAnnotation(d as Annotation);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add annotation");
      setDraft(null);
    }
  };

  if (!page) return null;

  const cssW = page.width * scale;
  const cssH = page.height * scale;

  const matchRects =
    searchIndex >= 0 && searchMatches[searchIndex]?.pageIndex === pageIndex
      ? searchMatches[searchIndex].rects
      : [];

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
      {matchRects.map((r, i) => (
        <div
          key={i}
          className="pointer-events-none absolute z-20 bg-amber-400/40 ring-2 ring-amber-500"
          style={{
            left: r.x * scale,
            top: r.y * scale,
            width: r.w * scale,
            height: r.h * scale,
          }}
        />
      ))}
      <AnnotationLayer
        pageIndex={pageIndex}
        scale={scale}
        width={cssW}
        height={cssH}
      />
      <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
        {pageIndex + 1}
      </div>
    </div>
  );
}
