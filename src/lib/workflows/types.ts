/** Named Action Wizard sequences — 100% client-side. */

export type WorkflowStepKind =
  | "ocr"
  | "compress"
  | "protect"
  | "scan-enhance"
  | "flatten"
  | "linearize"
  | "grayscale";

export type WorkflowStep = {
  id: string;
  kind: WorkflowStepKind;
  label: string;
  params?: {
    compressPreset?: "web" | "balanced" | "max" | "print";
    ocrLang?: string;
    scanMode?: "contrast" | "threshold" | "deskew-approx";
  };
};

export type SavedWorkflow = {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  starter?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type WorkflowRunContext = {
  password?: string;
  ocrLang?: string;
  onProgress?: (pct: number, label: string) => void;
  isCancelled?: () => boolean;
};

export const STEP_KIND_META: Record<
  WorkflowStepKind,
  { label: string; needsPassword?: boolean; hint: string }
> = {
  ocr: {
    label: "OCR (searchable)",
    hint: "Tesseract in-browser — slow on long scans",
  },
  compress: {
    label: "Compress",
    hint: "Downsample pages with a size preset",
  },
  protect: {
    label: "Protect",
    needsPassword: true,
    hint: "Encrypt with a password (entered when you run)",
  },
  "scan-enhance": {
    label: "Scan enhance",
    hint: "Contrast / threshold cleanup for scans",
  },
  flatten: {
    label: "Flatten forms",
    hint: "Burn AcroForm fields into page content",
  },
  linearize: {
    label: "Optimize structure",
    hint: "Rewrite with object streams (best-effort)",
  },
  grayscale: {
    label: "Grayscale",
    hint: "Convert pages to grayscale",
  },
};
