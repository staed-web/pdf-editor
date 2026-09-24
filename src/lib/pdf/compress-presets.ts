/**
 * Optimizer presets for /compress — client-side downsample + JPEG re-encode.
 * All presets are lossy (page raster → JPEG). No proprietary binaries.
 */

export type CompressPresetId = "web" | "balanced" | "max" | "print";

/** Legacy Wave 1 quality knobs — still accepted by compressPdf. */
export type CompressQualityLegacy = "low" | "medium" | "high";

export type CompressPreset = {
  id: CompressPresetId;
  /** Primary label shown to users (Email / Web / High quality / …) */
  label: string;
  short: string;
  hint: string;
  /** Plain note that this is lossy — never claim lossless */
  fidelity: string;
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
    label: "Email",
    short: "Small",
    hint: "Best for email attachments & phones — smaller files, softer detail.",
    fidelity: "Lossy · JPEG ~40% · max edge 1024px",
    q: 0.4,
    scale: 1.0,
    maxEdge: 1024,
    linearize: true,
  },
  {
    id: "balanced",
    label: "Web",
    short: "Default",
    hint: "Everyday sharing online — good balance of size and clarity.",
    fidelity: "Lossy · JPEG ~58% · max edge 1600px",
    q: 0.58,
    scale: 1.35,
    maxEdge: 1600,
    linearize: true,
  },
  {
    id: "print",
    label: "High quality",
    short: "Clearer",
    hint: "Keeps more detail for printing or important docs — larger file.",
    fidelity: "Lossy · JPEG ~82% · max edge 2800px",
    q: 0.82,
    scale: 1.85,
    maxEdge: 2800,
    linearize: false,
  },
  {
    id: "max",
    label: "Smallest",
    short: "Max shrink",
    hint: "Push size down hard for scans/photos — text may look soft.",
    fidelity: "Lossy · JPEG ~30% · max edge 880px",
    q: 0.3,
    scale: 0.85,
    maxEdge: 880,
    linearize: true,
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
      reason: "Large file — Email usually shrinks scans & photo pages most.",
    };
  }
  if (mb >= 4 || perPage >= 400 * 1024) {
    return {
      id: "max",
      reason: "Bulky pages — Smallest if you need the tiniest shareable PDF.",
    };
  }
  if (mb < 0.4 && pages <= 5) {
    return {
      id: "print",
      reason: "Already small — High quality keeps more detail if you need it.",
    };
  }
  return {
    id: "balanced",
    reason: "Web is a solid default for everyday sharing.",
  };
}
