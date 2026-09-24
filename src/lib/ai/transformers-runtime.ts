/**
 * Lazy browser-only entry for @xenova/transformers.
 * Models are fetched from Hugging Face CDN and cached via Cache API / IndexedDB
 * (transformers.js defaults). Never imported from non-AI tool routes.
 */

export type ProgressCb = (info: {
  status: string;
  progress?: number;
  file?: string;
  loaded?: number;
  total?: number;
}) => void;

let configured = false;

export type TransformersMod = typeof import("@xenova/transformers");

export async function loadTransformers(): Promise<TransformersMod> {
  if (typeof window === "undefined") {
    throw new Error("On-device models only run in the browser");
  }
  const mod = await import(
    /* webpackChunkName: "xenova-transformers" */ "@xenova/transformers"
  );
  if (!configured) {
    // Remote HF hub only — do not look for /models on this origin
    mod.env.allowLocalModels = false;
    mod.env.allowRemoteModels = true;
    mod.env.useBrowserCache = true;
    // Keep WASM off the Node path; onnxruntime-web is browser-bundled
    try {
      // Prefer CDN WASM so Vercel static hosting doesn't need local .wasm copies
      const onnx = mod.env.backends?.onnx as { wasm?: { wasmPaths?: string } };
      if (onnx?.wasm) {
        onnx.wasm.wasmPaths =
          "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/";
      }
    } catch {
      /* defaults ok */
    }
    configured = true;
  }
  return mod;
}

export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

/** Rough char budget ≈ tokens * 4 for English-ish text */
export function chunkText(text: string, maxChars = 2800, overlap = 200): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];
  const chunks: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    let end = Math.min(i + maxChars, cleaned.length);
    if (end < cleaned.length) {
      const slice = cleaned.slice(i, end);
      const lastStop = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("? "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("\n")
      );
      if (lastStop > maxChars * 0.4) end = i + lastStop + 1;
    }
    chunks.push(cleaned.slice(i, end).trim());
    if (end >= cleaned.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return chunks.filter(Boolean);
}
