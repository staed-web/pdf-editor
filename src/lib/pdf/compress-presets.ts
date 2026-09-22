/**
 * Optimizer presets for /compress — client-side downsample + JPEG re-encode.
 * Capability inspiration only; no proprietary binaries.
 */

export type CompressPresetId = "web" | "balanced" | "max" | "print";

/** Legacy Wave 1 quality knobs — still accepted by compressPdf. */
export type CompressQualityLegacy = "low" | "medium" | "high";

export type CompressPreset = {
  id: CompressPresetId;
  label: string;
  short: string;
  hint: string;
  /** JPEG quality 0–1 */
  q: number;
  /** Render scale before max-edge clamp */
  scale: number;
  /** Max long-edge pixels */
  maxEdge: number;
  /** Rewrite with object streams after raster compress (best-effort “linearize”) */
  linearize: boolean;
};

export const COMPRESS_PRESETS: CompressPreset[] = [
  {
    id: "web",
    label: "Web / Mobile",
    short: "Aggressive",
    hint: "Smallest practical for email & phones — heavy downsample + structure rewrite.",
    q: 0.4,
    scale: 1.0,
    maxEdge: 1024,
    linearize: true,
  },
  {
    id: "balanced",
    label: "Balanced",
    short: "Default",
    hint: "Good size vs clarity for everyday sharing.",
    q: 0.58,
    scale: 1.35,
    maxEdge: 1600,
    linearize: true,
  },
  {
    id: "max",
    label: "Max shrink",
    short: "Tiniest",
    hint: "Push size down hard — scans/photos; text may look soft.",
    q: 0.3,
    scale: 0.85,
    maxEdge: 880,
    linearize: true,
  },
  {
    id: "print",
    label: "Print-ish",
    short: "Gentler",
    hint: "Higher DPI/JPEG quality for print or archival sharing.",
    q: 0.82,
    scale: 1.85,
    maxEdge: 2800,
    linearize: false,
  },
];

const LEGACY_MAP: Record<CompressQualityLegacy, CompressPresetId> = {
  low: "max",
  medium: "balanced",
  high: "print",
};

export function resolveCompressPreset(
  input: CompressPresetId | CompressQualityLegacy | string
): CompressPreset {
  const id = (
    input in LEGACY_MAP
      ? LEGACY_MAP[input as CompressQualityLegacy]
      : input
  ) as CompressPresetId;
  return (
    COMPRESS_PRESETS.find((p) => p.id === id) ??
    COMPRESS_PRESETS.find((p) => p.id === "balanced")!
  );
}

/** Heuristic recommendation from file size / page count. */
export function recommendCompressPreset(opts: {
  sizeBytes: number;
  pageCount: number | null;
}): { id: CompressPresetId; reason: string } {
  const pages = opts.pageCount ?? 1;
  const perPage = opts.sizeBytes / Math.max(1, pages);
  const mb = opts.sizeBytes / (1024 * 1024);

  if (mb >= 12 || perPage >= 1.2 * 1024 * 1024) {
    return {
      id: "web",
      reason: "Large file — Web/Mobile usually shrinks scans & photo pages most.",
    };
  }
  if (mb >= 4 || perPage >= 400 * 1024) {
    return {
      id: "max",
      reason: "Bulky pages — Max shrink if you need the smallest shareable PDF.",
    };
  }
  if (mb < 0.4 && pages <= 5) {
    return {
      id: "print",
      reason: "Already small — Print-ish keeps quality if you need higher fidelity.",
    };
  }
  return {
    id: "balanced",
    reason: "Balanced is a solid default for everyday sharing.",
  };
}
