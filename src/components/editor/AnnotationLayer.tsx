"use client";

import { useEditorStore } from "@/store/editorStore";
import type { Annotation } from "@/store/types";
import { cn } from "@/lib/utils";

interface Props {
  pageIndex: number;
  scale: number;
  width: number;
  height: number;
}

function AnnSvg({
  ann,
  scale,
  selected,
  onSelect,
}: {
  ann: Annotation;
  scale: number;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
}) {
  const common = cn(
    "pointer-events-auto cursor-pointer",
    selected && "outline outline-2 outline-amber-400 outline-offset-2"
  );

  switch (ann.type) {
    case "highlight":
    case "underline":
    case "strikethrough":
      return (
        <g onClick={onSelect} className={common}>
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
      if (ann.points.length < 2) return null;
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
          onClick={onSelect}
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
            onClick={onSelect}
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
          onClick={onSelect}
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
        <g onClick={onSelect} className={common}>
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
        </g>
      );
    }
    case "textbox":
      return (
        <g onClick={onSelect} className={common}>
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
            width={ann.w * scale}
            height={ann.h * scale}
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
        <g onClick={onSelect} className={common}>
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
          {ann.text && (
            <title>{ann.text}</title>
          )}
        </g>
      );
    case "stamp":
      return (
        <g onClick={onSelect} className={common}>
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
        <g onClick={onSelect} className={common}>
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
  const tool = useEditorStore((s) => s.tool);
  const draft = useEditorStore((s) => s.draft);

  const pageAnns = annotations.filter((a) => a.pageIndex === pageIndex);

  return (
    <svg
      className="absolute inset-0 z-10"
      width={width}
      height={height}
      style={{ pointerEvents: tool === "pan" ? "none" : "auto" }}
    >
      {pageAnns.map((ann) => (
        <AnnSvg
          key={ann.id}
          ann={ann}
          scale={scale}
          selected={selectedIds.includes(ann.id)}
          onSelect={(e) => {
            e.stopPropagation();
            if (tool === "select") {
              selectAnnotations(
                e.shiftKey ? [...selectedIds, ann.id] : [ann.id]
              );
            }
          }}
        />
      ))}
      {draft && draft.pageIndex === pageIndex && draft.type && (
        <AnnSvg
          ann={draft as Annotation}
          scale={scale}
          selected={false}
          onSelect={() => {}}
        />
      )}
    </svg>
  );
}
