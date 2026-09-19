"use client";

import { GripVertical, X, FileText } from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type QueueFile = {
  id: string;
  file: File;
  name: string;
  size: number;
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
  if (!files.length) return null;
  return (
    <ul className={cn("space-y-2", className)}>
      {files.map((f, i) => (
        <li
          key={f.id}
          draggable={!!onReorder}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", String(i));
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData("text/plain"));
            if (!Number.isNaN(from) && onReorder) onReorder(from, i);
          }}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          {onReorder && (
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-zinc-400" />
          )}
          <FileText className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {f.name}
            </p>
            <p className="text-[11px] text-zinc-500">{formatBytes(f.size)}</p>
          </div>
          <span className="text-[11px] tabular-nums text-zinc-400">#{i + 1}</span>
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
  );
}
