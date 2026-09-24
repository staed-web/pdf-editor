"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function DropZone({
  accept,
  multiple,
  onFiles,
  label = "Drop files here",
  hint,
  className,
  disabled,
  pickerLabel,
  capture,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  /** Clear CTA — e.g. "Choose PDF" / "Choose images" */
  pickerLabel?: string;
  /** Camera capture on supported mobile browsers (images) */
  capture?: boolean | "user" | "environment";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const isPdf =
    !!accept && (accept.includes("pdf") || accept === "application/pdf");
  const isImage =
    !!accept &&
    (accept.includes("image") ||
      accept.includes(".jpg") ||
      accept.includes(".png"));

  const resolvedPicker =
    pickerLabel ||
    (isPdf ? (multiple ? "Choose PDFs" : "Choose PDF") : null) ||
    (isImage ? (multiple ? "Choose images" : "Choose image") : null) ||
    (multiple ? "Choose files" : "Choose file");

  const resolvedHint =
    hint ??
    (multiple
      ? "Tap to browse — add more files after the first pick if needed"
      : "or tap to browse");

  const take = useCallback(
    (list: FileList | File[] | null) => {
      if (!list || disabled) return;
      const files = Array.from(list);
      if (files.length) onFiles(files);
    },
    [onFiles, disabled]
  );

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const captureValue =
    capture === true ? "environment" : capture === false || capture == null ? undefined : capture;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") openPicker();
      }}
      onClick={openPicker}
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
        "group relative flex min-h-[11rem] cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border-2 border-dashed px-6 py-10 transition-all sm:min-h-[12.5rem] sm:py-14",
        drag
          ? "border-amber-500 bg-amber-500/10"
          : "border-[var(--border)] bg-[var(--card)] hover:border-amber-400/60 hover:bg-amber-50/30 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/5",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
        <FileUp className="h-6 w-6" />
      </div>
      <p className="text-[15px] font-semibold tracking-tight text-foreground">
        {label}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{resolvedHint}</p>
      <span
        className="touch-target mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-5 text-sm font-semibold text-zinc-950 shadow-sm"
        aria-hidden
      >
        {resolvedPicker}
      </span>
      <p className="mt-3 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
        Processed in your browser — files never uploaded
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        capture={captureValue}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
