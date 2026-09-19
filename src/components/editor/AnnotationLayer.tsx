"use client";

import { useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import type { Annotation } from "@/store/types";
import { cn } from "@/lib/utils";

interface Props {
  pageIndex: number;
  scale: number;
  width: number;
  height: number;
}

function shiftAnnotation(ann: Annotation, dx: number, dy: number): Annotation {
  switch (ann.type) {
    case "highlight":
    case "underline":
    case "strikethrough":
      return {
        ...ann,
        rects: ann.rects.map((r) => ({ ...r, x: r.x + dx, y: r.y + dy })),
      };
    case "pen":
      return {
        ...ann,
        points: ann.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      };
    case "note":
      return { ...ann, x: ann.x + dx, y: ann.y + dy };
    default:
      return { ...ann, x: ann.x + dx, y: ann.y + dy } as Annotation;
  }
}

function AnnSvg({
  ann,
  scale,
  selected,
  interactive,
  onSelect,
  onDragStart,
}: {
  ann: Annotation;
  scale: number;
  selected: boolean;
  interactive: boolean;
  onSelect: (e: React.PointerEvent) => void;
  onDragStart: (e: React.PointerEvent, ann: Annotation) => void;
}) {
  const common = cn(
    interactive && "pointer-events-auto cursor-move",
    selected && "outline outline-2 outline-amber-400 outline-offset-2"
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelect(e);
    onDragStart(e, ann);
  };

  switch (ann.type) {
    case "highlight":
    case "underline":
    case "strikethrough":
      return (
        <g onPointerDown={handlePointerDown} className={common}>
          {ann.rects.map((r, i) =>
            ann.type === "highlight" ? (
              <rect
                key={i}
                x={r.x * scale}
                y={r.y * scale}
                width={r.w * scale}
                height={r.h * scale}
                fill={ann.color}
                opacity={ann.opacity}
              />
            ) : (
              <line
                key={i}
                x1={r.x * scale}
                x2={(r.x + r.w) * scale}
                y1={
                  ann.type === "underline"
                    ? (r.y + r.h) * scale
                    : (r.y + r.h / 2) * scale
                }
                y2={
                  ann.type === "underline"
                    ? (r.y + r.h) * scale
                    : (r.y + r.h / 2) * scale
                }
                stroke={ann.color}
                strokeWidth={Math.max(1, ann.strokeWidth) * scale}
                opacity={Math.max(0.6, ann.opacity)}
              />
            )
          )}
        </g>
      );
    case "pen": {
      if (!ann.points || ann.points.length < 2) return null;
      const d = ann.points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x * scale} ${p.y * scale}`)
        .join(" ");
      return (
        <path
          d={d}
          fill="none"
          stroke={ann.color}
          strokeWidth={ann.strokeWidth * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={Math.max(0.7, ann.opacity)}
          onPointerDown={handlePointerDown}
          className={common}
        />
      );
    }
    case "rect":
    case "ellipse": {
      const x = Math.min(ann.x, ann.x + ann.w) * scale;
      const y = Math.min(ann.y, ann.y + ann.h) * scale;
      const w = Math.abs(ann.w) * scale;
      const h = Math.abs(ann.h) * scale;
      if (ann.type === "rect") {
        return (
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            fill={ann.filled ? ann.fillColor : "none"}
            fillOpacity={ann.filled ? ann.opacity : 0}
            stroke={ann.color}
            strokeWidth={ann.strokeWidth * scale}
            onPointerDown={handlePointerDown}
            className={common}
          />
        );
      }
      return (
        <ellipse
          cx={x + w / 2}
          cy={y + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill={ann.filled ? ann.fillColor : "none"}
          fillOpacity={ann.filled ? ann.opacity : 0}
          stroke={ann.color}
          strokeWidth={ann.strokeWidth * scale}
          onPointerDown={handlePointerDown}
          className={common}
        />
      );
    }
    case "line":
    case "arrow": {
      const x1 = ann.x * scale;
      const y1 = ann.y * scale;
      const x2 = (ann.x + ann.w) * scale;
      const y2 = (ann.y + ann.h) * scale;
      const markerId = `arrow-${ann.id}`;
      return (
        <g onPointerDown={handlePointerDown} className={common}>
          {ann.type === "arrow" && (
            <defs>
              <marker
                id={markerId}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill={ann.color} />
              </marker>
            </defs>
          )}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={ann.color}
            strokeWidth={ann.strokeWidth * scale}
            markerEnd={ann.type === "arrow" ? `url(#${markerId})` : undefined}
          />
          {/* Wider invisible hit target */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="transparent"
            strokeWidth={Math.max(12, ann.strokeWidth * 4) * scale}
          />
        </g>
      );
    }
    case "textbox":
      return (
        <g onPointerDown={handlePointerDown} className={common}>
          <rect
            x={ann.x * scale}
            y={ann.y * scale}
            width={ann.w * scale}
            height={ann.h * scale}
            fill="white"
            fillOpacity={0.92}
            stroke={ann.color}
            strokeWidth={1}
            rx={2}
          />
          <foreignObject
            x={ann.x * scale}
            y={ann.y * scale}
            width={Math.max(0, ann.w * scale)}
            height={Math.max(0, ann.h * scale)}
          >
            <div
              className="h-full w-full overflow-hidden p-1 text-left"
              style={{
                color: ann.color,
                fontSize: ann.fontSize * scale,
                fontFamily: ann.fontFamily,
                lineHeight: 1.25,
              }}
            >
              {ann.text || "Text"}
            </div>
          </foreignObject>
        </g>
      );
    case "note":
      return (
        <g onPointerDown={handlePointerDown} className={common}>
          <rect
            x={ann.x * scale}
            y={ann.y * scale}
            width={18 * scale}
            height={18 * scale}
            fill={ann.color}
            rx={2 * scale}
          />
          <text
            x={(ann.x + 5) * scale}
            y={(ann.y + 13) * scale}
            fill="#111"
            fontSize={11 * scale}
            fontWeight={700}
          >
            N
          </text>
          {ann.text && <title>{ann.text}</title>}
        </g>
      );
    case "stamp":
      return (
        <g onPointerDown={handlePointerDown} className={common}>
          <rect
            x={ann.x * scale}
            y={ann.y * scale}
            width={ann.w * scale}
            height={ann.h * scale}
            fill="none"
            stroke={ann.color}
            strokeWidth={2 * scale}
            rx={4}
            opacity={0.9}
          />
          <text
            x={(ann.x + ann.w / 2) * scale}
            y={(ann.y + ann.h / 2) * scale}
            fill={ann.color}
            fontSize={Math.min(ann.h * 0.4, 18) * scale}
            fontWeight={800}
            textAnchor="middle"
            dominantBaseline="middle"
            opacity={0.85}
            style={{ letterSpacing: "0.08em" }}
          >
            {ann.label}
          </text>
        </g>
      );
    case "signature":
      return (
        <g onPointerDown={handlePointerDown} className={common}>
          <rect
            x={ann.x * scale}
            y={ann.y * scale}
            width={ann.w * scale}
            height={ann.h * scale}
            fill="transparent"
            stroke={selected ? ann.color : "transparent"}
            strokeDasharray="4 2"
          />
          {ann.dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <image
              href={ann.dataUrl}
              x={ann.x * scale}
              y={ann.y * scale}
              width={ann.w * scale}
              height={ann.h * scale}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <text
              x={(ann.x + 8) * scale}
              y={(ann.y + ann.h * 0.65) * scale}
              fill={ann.color}
              fontSize={(ann.fontSize || 22) * scale}
              fontFamily="Georgia, serif"
              fontStyle="italic"
            >
              {ann.text || "Signature"}
            </text>
          )}
        </g>
      );
    default:
      return null;
  }
}

export function AnnotationLayer({ pageIndex, scale, width, height }: Props) {
  const annotations = useEditorStore((s) => s.annotations);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectAnnotations = useEditorStore((s) => s.selectAnnotations);
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const tool = useEditorStore((s) => s.tool);
  const draft = useEditorStore((s) => s.draft);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origin: Annotation;
    moved: boolean;
  } | null>(null);

  const pageAnns = annotations.filter((a) => a.pageIndex === pageIndex);
  const interactive = tool === "select";

  const onDragStart = (e: React.PointerEvent, ann: Annotation) => {
    if (!interactive) return;
    e.preventDefault();
    const drag = {
      id: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      origin: structuredClone(ann),
      moved: false,
    };
    dragRef.current = drag;

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startX) / scale;
      const dy = (ev.clientY - d.startY) / scale;
      if (!d.moved && Math.hypot(dx, dy) < 1) return;
      if (!d.moved) {
        pushHistory();
        d.moved = true;
      }
      updateAnnotation(d.id, shiftAnnotation(d.origin, dx, dy));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <svg
      className={interactive ? "absolute inset-0 z-20" : "absolute inset-0 z-10"}
      width={width}
      height={height}
      style={{ pointerEvents: interactive ? "auto" : "none" }}
    >
      {pageAnns.map((ann) => (
        <AnnSvg
          key={ann.id}
          ann={ann}
          scale={scale}
          selected={selectedIds.includes(ann.id)}
          interactive={interactive}
          onSelect={(e) => {
            selectAnnotations(
              e.shiftKey
                ? selectedIds.includes(ann.id)
                  ? selectedIds
                  : [...selectedIds, ann.id]
                : [ann.id]
            );
          }}
          onDragStart={onDragStart}
        />
      ))}
      {draft &&
        draft.pageIndex === pageIndex &&
        draft.type &&
        (draft.type !== "pen" ||
          ((draft as { points?: unknown[] }).points?.length ?? 0) >= 1) && (
          <AnnSvg
            ann={draft as Annotation}
            scale={scale}
            selected={false}
            interactive={false}
            onSelect={() => {}}
            onDragStart={() => {}}
          />
        )}
    </svg>
  );
}
