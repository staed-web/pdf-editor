import { formatBytes } from "@/lib/utils";
import { loadPdf } from "./ops";

/** Soft limits for browser stability — documented in UI, not hard blocks. */
export const SOFT_LIMITS = {
  /** Warn when a single file exceeds this many bytes */
  fileBytesWarn: 20 * 1024 * 1024,
  /** Soft max for a single file — show strong warning */
  fileBytesSoftMax: 80 * 1024 * 1024,
  /** Warn when page count exceeds this */
  pagesWarn: 50,
  /** Soft max pages */
  pagesSoftMax: 200,
  /** Batch: max files */
  batchMaxFiles: 20,
  /** Batch: total bytes soft max */
  batchMaxTotalBytes: 100 * 1024 * 1024,
  /** Batch: warn per-file pages */
  batchPagesWarn: 40,
} as const;

export type ProcessErrorKind =
  | "corrupt"
  | "password"
  | "unsupported"
  | "oversized"
  | "oom"
  | "empty"
  | "cancelled"
  | "unknown";

export type ProcessErrorInfo = {
  kind: ProcessErrorKind;
  title: string;
  message: string;
  hint?: string;
};

export type PdfFileSummary = {
  name: string;
  size: number;
  pageCount: number | null;
  encrypted: boolean;
  warnings: string[];
};

export function suggestedName(original: string, suffix: string, ext = "pdf") {
  const base = original.replace(/\.[^.]+$/i, "") || "document";
  const cleanExt = ext.replace(/^\./, "");
  return `${base}-${suffix}.${cleanExt}`;
}

/** True on phones / coarse pointers — lower memory budget. */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth < 768
    );
  } catch {
    return false;
  }
}

export function memoryWarning(size: number, pageCount: number | null): string | null {
  const mobile = isCoarsePointer();
  const bytesWarn = mobile ? 8 * 1024 * 1024 : SOFT_LIMITS.fileBytesWarn;
  const bytesMax = mobile ? 32 * 1024 * 1024 : SOFT_LIMITS.fileBytesSoftMax;
  const pagesWarn = mobile ? 20 : SOFT_LIMITS.pagesWarn;
  const pagesMax = mobile ? 80 : SOFT_LIMITS.pagesSoftMax;
  const phoneNote = mobile
    ? " On a phone this can freeze the tab — Wi-Fi + a smaller file (or split first) is safer."
    : "";
  if (size >= bytesMax) {
    return `This file is ${formatBytes(size)} — very large for in-browser processing. Close other tabs or try a smaller file if the tab freezes.${phoneNote}`;
  }
  if (size >= bytesWarn) {
    return `Large file (${formatBytes(size)}). Processing stays on your device and may use significant memory.${phoneNote}`;
  }
  if (pageCount != null && pageCount >= pagesMax) {
    return `${pageCount} pages is a lot for the browser. Consider splitting first for smoother results.${phoneNote}`;
  }
  if (pageCount != null && pageCount >= pagesWarn) {
    return `${pageCount} pages — expect longer processing and higher memory use.${phoneNote}`;
  }
  return null;
}

export async function inspectPdfFile(file: File): Promise<PdfFileSummary> {
  const warnings: string[] = [];
  let pageCount: number | null = null;
  let encrypted = false;

  try {
    const buf = await file.arrayBuffer();
    // Detect encryption header / /Encrypt without fully decrypting
    const head = new TextDecoder("latin1").decode(
      buf.byteLength > 4096 ? buf.slice(0, 4096) : buf
    );
    if (/\/Encrypt\b/.test(head)) {
      encrypted = true;
      warnings.push(
        "This PDF appears password-protected. Some tools need the password (use Unlock first)."
      );
    }
    const doc = await loadPdf(buf);
    pageCount = doc.getPageCount();
  } catch (e) {
    const classified = classifyProcessError(e);
    if (classified.kind === "password") {
      encrypted = true;
      warnings.push(classified.message);
    } else if (classified.kind === "corrupt") {
      warnings.push(classified.message);
    } else {
      warnings.push("Could not fully inspect this PDF — it may still process.");
    }
  }

  const mem = memoryWarning(file.size, pageCount);
  if (mem) warnings.push(mem);

  return {
    name: file.name,
    size: file.size,
    pageCount,
    encrypted,
    warnings,
  };
}

export function classifyProcessError(err: unknown): ProcessErrorInfo {
  if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "AbortError") {
    return {
      kind: "cancelled",
      title: "Cancelled",
      message: "Processing was cancelled.",
      hint: "Your files stayed on this device. Try again when ready.",
    };
  }

  const raw =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === "string"
        ? err
        : "Unknown error";
  const msg = raw.toLowerCase();

  if (
    msg.includes("password") ||
    msg.includes("encrypted") ||
    msg.includes("encryption") ||
    msg.includes("needapassword") ||
    msg.includes("passwordexception")
  ) {
    return {
      kind: "password",
      title: "Password-protected PDF",
      message: "This file is encrypted and needs a password before it can be processed.",
      hint: "Open Unlock PDF, enter the password, then retry — or use a copy without encryption.",
    };
  }

  if (
    msg.includes("out of memory") ||
    msg.includes("oom") ||
    msg.includes("allocation failed") ||
    msg.includes("array buffer allocation") ||
    msg.includes("maximum call stack")
  ) {
    return {
      kind: "oom",
      title: "Ran out of memory",
      message: "The browser ran out of memory while processing this file.",
      hint: "Try a smaller file, fewer pages, lower quality, or close other tabs. Soft limits: ~80 MB / ~200 pages per file.",
    };
  }

  if (
    msg.includes("too large") ||
    msg.includes("oversized") ||
    msg.includes("file too big") ||
    msg.includes("exceeds")
  ) {
    return {
      kind: "oversized",
      title: "File too large",
      message: "This file exceeds comfortable in-browser limits.",
      hint: `Soft limit ~${SOFT_LIMITS.fileBytesSoftMax / (1024 * 1024)} MB. Compress or split first.`,
    };
  }

  if (
    msg.includes("invalid pdf") ||
    msg.includes("corrupt") ||
    msg.includes("damaged") ||
    msg.includes("missing pdf header") ||
    msg.includes("bad xref") ||
    msg.includes("failed to parse") ||
    msg.includes("formaterror")
  ) {
    return {
      kind: "corrupt",
      title: "Corrupt or unreadable PDF",
      message: "This file doesn’t look like a valid PDF, or it’s damaged.",
      hint: "Try Repair PDF, re-export from the original app, or use a different copy.",
    };
  }

  if (
    msg.includes("unsupported") ||
    msg.includes("not supported") ||
    msg.includes("cannot") && msg.includes("format")
  ) {
    return {
      kind: "unsupported",
      title: "Unsupported file",
      message: "This format or feature isn’t supported in the browser build.",
      hint: "Use a standard PDF (1.4–1.7) without exotic encryption or exotic compression.",
    };
  }

  if (
    msg.includes("empty") ||
    msg.includes("no file") ||
    msg.includes("at least") ||
    msg.includes("add at least") ||
    msg.includes("no region") ||
    msg.includes("no page")
  ) {
    return {
      kind: "empty",
      title: "Nothing to process",
      message: err instanceof Error ? err.message : "Add a file or complete the required options.",
      hint: "Select a PDF and fill in any required options, then try again.",
    };
  }

  return {
    kind: "unknown",
    title: "Something went wrong",
    message: err instanceof Error ? err.message : "Processing failed.",
    hint: "Check that the file is a valid PDF. Nothing was uploaded — try again or use a smaller file.",
  };
}

export function softLimitsCopy(kind: "tool" | "batch" = "tool"): string {
  if (kind === "batch") {
    return `Soft limits for browser stability: up to ${SOFT_LIMITS.batchMaxFiles} files · ~${SOFT_LIMITS.batchMaxTotalBytes / (1024 * 1024)} MB total · prefer ≤${SOFT_LIMITS.batchPagesWarn} pages per file. Everything stays on your device.`;
  }
  const mobile = isCoarsePointer();
  const base = `Soft limits for browser stability: prefer under ${SOFT_LIMITS.fileBytesWarn / (1024 * 1024)} MB and ~${SOFT_LIMITS.pagesWarn} pages (harder past ~${SOFT_LIMITS.fileBytesSoftMax / (1024 * 1024)} MB / ${SOFT_LIMITS.pagesSoftMax} pages). 100% local — nothing uploaded.`;
  if (mobile) {
    return `${base} On phones, stay under ~8 MB / ~20 pages when possible.`;
  }
  return base;
}
