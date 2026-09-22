import type { SavedWorkflow, WorkflowRunContext, WorkflowStep } from "./types";
import { DEFAULT_OCR_LANG } from "@/lib/pdf/ocr-langs";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

async function runStep(
  step: WorkflowStep,
  source: ArrayBuffer,
  ctx: WorkflowRunContext
): Promise<ArrayBuffer> {
  switch (step.kind) {
    case "compress": {
      const { compressPdf } = await import("@/lib/pdf/ops");
      const preset = step.params?.compressPreset ?? "balanced";
      const out = await compressPdf(source, preset);
      return toArrayBuffer(out.bytes);
    }
    case "ocr": {
      const { ocrToSearchablePdf } = await import("@/lib/pdf/ocr-searchable");
      const lang = ctx.ocrLang || step.params?.ocrLang || DEFAULT_OCR_LANG;
      const out = await ocrToSearchablePdf(source, {
        lang,
        onProgress: (pct, label) => ctx.onProgress?.(pct, label ?? step.label),
      });
      return toArrayBuffer(out.bytes);
    }
    case "protect": {
      if (!ctx.password) {
        throw new Error("Password required for Protect step");
      }
      const { protectPdf } = await import("@/lib/pdf/ops");
      const bytes = await protectPdf(source, ctx.password);
      return toArrayBuffer(bytes);
    }
    case "scan-enhance": {
      const { scanEnhance } = await import("@/lib/pdf/extra-ops");
      const mode = step.params?.scanMode ?? "contrast";
      const bytes = await scanEnhance(source, mode);
      return toArrayBuffer(bytes);
    }
    case "flatten": {
      const { flattenForms } = await import("@/lib/pdf/ops");
      const bytes = await flattenForms(source);
      return toArrayBuffer(bytes);
    }
    case "linearize": {
      const { optimizeStructure } = await import("@/lib/pdf/extra-ops");
      const bytes = await optimizeStructure(source);
      return toArrayBuffer(bytes);
    }
    case "grayscale": {
      const { grayscalePdf } = await import("@/lib/pdf/extra-ops");
      const bytes = await grayscalePdf(source);
      return toArrayBuffer(bytes);
    }
    default:
      throw new Error(`Unknown step: ${(step as WorkflowStep).kind}`);
  }
}

export async function runWorkflow(
  workflow: SavedWorkflow,
  source: ArrayBuffer,
  ctx: WorkflowRunContext = {}
): Promise<{ bytes: Uint8Array; stepsRun: number }> {
  let buf = source.slice(0);
  const total = Math.max(1, workflow.steps.length);
  let i = 0;
  for (const step of workflow.steps) {
    if (ctx.isCancelled?.()) {
      throw new DOMException("Aborted", "AbortError");
    }
    i += 1;
    const base = Math.round(((i - 1) / total) * 100);
    ctx.onProgress?.(base, `${step.label}…`);
    buf = await runStep(step, buf, {
      ...ctx,
      onProgress: (pct, label) => {
        const mapped = base + Math.round((pct / 100) * (100 / total));
        ctx.onProgress?.(Math.min(99, mapped), label || step.label);
      },
    });
    ctx.onProgress?.(Math.round((i / total) * 100), `Done: ${step.label}`);
  }
  return { bytes: new Uint8Array(buf), stepsRun: workflow.steps.length };
}

export function workflowNeedsPassword(workflow: SavedWorkflow): boolean {
  return workflow.steps.some((s) => s.kind === "protect");
}
