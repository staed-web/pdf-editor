"use client";

import { useState } from "react";
import { GripVertical, X, FileText, ChevronUp, ChevronDown } from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type QueueFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  /** Page count when known (e.g. after inspect on /merge) */
  pageCount?: number | null;
};

export function FileQueue({
  files,
  onRemove,
  onReorder,
  className,
}: {
  files: QueueFile[];
  onRemove: (id: string) => void;
  onReorder?: (from: number, to: number) => void;
  className?: string;
}) {
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  if (!files.length) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {onReorder && (
        <p className="text-[11px] font-medium text-zinc-500">
          Drag the{" "}
          <span className="inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            <GripVertical className="h-3 w-3" /> handle
          </span>{" "}
          to reorder · or use arrows
        </p>
      )}
      <ul className="space-y-2">
        {files.map((f, i) => (
          <li
            key={f.id}
            draggable={!!onReorder}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", String(i));
              e.dataTransfer.effectAllowed = "move";
              setDragging(i);
            }}
            onDragEnd={() => {
              setDragging(null);
              setDragOver(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(i);
            }}
            onDragLeave={() => setDragOver((cur) => (cur === i ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData("text/plain"));
              setDragOver(null);
              setDragging(null);
              if (!Number.isNaN(from) && onReorder) onReorder(from, i);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition dark:bg-zinc-900",
              dragOver === i && dragging !== i
                ? "border-amber-500 ring-2 ring-amber-400/40"
                : "border-zinc-200 dark:border-zinc-800",
              dragging === i && "opacity-60"
            )}
          >
            {onReorder && (
              <button
                type="button"
                className="flex h-9 w-8 shrink-0 cursor-grab flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 active:cursor-grabbing dark:border-zinc-600 dark:bg-zinc-800"
                aria-label={`Drag to reorder ${f.name}`}
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            <FileText className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {f.name}
              </p>
              <p className="text-[11px] text-zinc-500">
                {formatBytes(f.size)}
                {f.pageCount != null
                  ? ` · ${f.pageCount} page${f.pageCount === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
            {f.pageCount != null && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                {f.pageCount}p
              </span>
            )}
            <span className="text-[11px] tabular-nums text-zinc-400">#{i + 1}</span>
            {onReorder && (
              <div className="flex shrink-0 flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400"
                  disabled={i === 0}
                  aria-label="Move up"
                  onClick={() => onReorder(i, i - 1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400"
                  disabled={i === files.length - 1}
                  aria-label="Move down"
                  onClick={() => onReorder(i, i + 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-red-500"
              onClick={() => onRemove(f.id)}
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
