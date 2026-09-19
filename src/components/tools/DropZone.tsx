"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function DropZone({
  accept,
  multiple,
  onFiles,
  label = "Drop files here",
  hint = "or click to browse",
  className,
  disabled,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const take = useCallback(
    (list: FileList | File[] | null) => {
      if (!list || disabled) return;
      const files = Array.from(list);
      if (files.length) onFiles(files);
    },
    [onFiles, disabled]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 transition-all",
        drag
          ? "border-amber-500 bg-amber-500/10"
          : "border-zinc-300 bg-zinc-50/80 hover:border-amber-400/70 hover:bg-amber-50/40 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/5",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-zinc-950 shadow-lg shadow-amber-500/20">
        <FileUp className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{label}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      <p className="mt-3 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
        Processed in your browser — files never uploaded
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
