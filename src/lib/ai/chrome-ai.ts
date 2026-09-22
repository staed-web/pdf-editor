/**
 * Chrome / Edge built-in AI helpers (2026 API shape).
 * Prefer global LanguageModel / Summarizer — window.ai is obsolete.
 */

export type Availability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available"
  | string;

export type ProgressFn = (pct: number, label: string) => void;

export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

function asAvailability(v: unknown): Availability {
  if (typeof v === "string") return v;
  if (v === true) return "available";
  if (v === false || v == null) return "unavailable";
  return "unavailable";
}

function isUsable(a: Availability): boolean {
  return a !== "unavailable" && a !== "no";
}

/** Detect Prompt API (LanguageModel) with legacy fallbacks. */
export function getLanguageModelCtor(): {
  availability?: (opts?: Record<string, unknown>) => Promise<unknown>;
  create: (opts?: Record<string, unknown>) => Promise<LanguageModelSession>;
} | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as Record<string, unknown>;
  if (typeof g.LanguageModel === "object" && g.LanguageModel) {
    return g.LanguageModel as ReturnType<typeof getLanguageModelCtor>;
  }
  // Legacy shapes (pre-2025 / origin trial)
  const ai =
    (g.ai as Record<string, unknown> | undefined) ||
    ((g.window as Record<string, unknown> | undefined)?.ai as
      | Record<string, unknown>
      | undefined);
  const lm =
    ai?.languageModel ||
    (ai as { createTextSession?: unknown } | undefined);
  if (lm && typeof (lm as { create?: unknown }).create === "function") {
    return lm as ReturnType<typeof getLanguageModelCtor>;
  }
  if (ai && typeof (ai as { createTextSession?: unknown }).createTextSession === "function") {
    return {
      create: async (opts?: Record<string, unknown>) => {
        const session = await (
          ai as {
            createTextSession: (
              o?: Record<string, unknown>
            ) => Promise<LanguageModelSession>;
          }
        ).createTextSession(opts);
        return session;
      },
    };
  }
  return null;
}

export type LanguageModelSession = {
  prompt: (
    input: string | unknown[],
    opts?: Record<string, unknown>
  ) => Promise<string>;
  promptStreaming?: (
    input: string | unknown[],
    opts?: Record<string, unknown>
  ) => ReadableStream<string> | AsyncIterable<string>;
  destroy?: () => void;
  contextUsage?: number;
  contextWindow?: number;
};

export async function languageModelAvailability(
  opts?: Record<string, unknown>
): Promise<Availability> {
  const ctor = getLanguageModelCtor();
  if (!ctor) return "unavailable";
  try {
    if (typeof ctor.availability === "function") {
      return asAvailability(await ctor.availability(opts));
    }
    return "available";
  } catch {
    return "unavailable";
  }
}

export async function isLanguageModelUsable(): Promise<boolean> {
  return isUsable(await languageModelAvailability(LM_DEFAULT_OPTS));
}

const LM_DEFAULT_OPTS = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

export async function createLanguageModelSession(opts: {
  signal?: AbortSignal;
  onProgress?: ProgressFn;
  systemPrompt?: string;
} = {}): Promise<LanguageModelSession | null> {
  const ctor = getLanguageModelCtor();
  if (!ctor) return null;
  throwIfAborted(opts.signal);

  const avail = await languageModelAvailability(LM_DEFAULT_OPTS);
  if (!isUsable(avail)) return null;

  try {
    opts.onProgress?.(10, "Starting browser built-in AI…");
    const createOpts: Record<string, unknown> = {
      ...LM_DEFAULT_OPTS,
      signal: opts.signal,
      monitor(m: EventTarget) {
        m.addEventListener("downloadprogress", ((e: Event) => {
          const ev = e as unknown as { loaded?: number };
          if (typeof ev.loaded === "number") {
            const pct = Math.min(40, Math.round(ev.loaded * 40));
            opts.onProgress?.(
              pct,
              `Downloading browser AI model… ${Math.round(ev.loaded * 100)}%`
            );
          }
        }) as EventListener);
      },
    };
    if (opts.systemPrompt) {
      createOpts.initialPrompts = [
        { role: "system", content: opts.systemPrompt },
      ];
    }
    const session = await ctor.create(createOpts);
    throwIfAborted(opts.signal);
    return session;
  } catch {
    return null;
  }
}

/** Detect Summarizer API (global Summarizer; self.ai.summarizer is obsolete). */
export function getSummarizerCtor(): {
  availability?: (opts?: Record<string, unknown>) => Promise<unknown>;
  create: (opts?: Record<string, unknown>) => Promise<BrowserSummarizer>;
} | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as Record<string, unknown>;
  if (typeof g.Summarizer === "object" && g.Summarizer) {
    return g.Summarizer as ReturnType<typeof getSummarizerCtor>;
  }
  const ai = g.ai as Record<string, unknown> | undefined;
  if (ai?.summarizer && typeof (ai.summarizer as { create?: unknown }).create === "function") {
    return ai.summarizer as ReturnType<typeof getSummarizerCtor>;
  }
  return null;
}

export type BrowserSummarizer = {
  summarize: (text: string, opts?: { context?: string }) => Promise<string>;
  summarizeStreaming?: (
    text: string,
    opts?: { context?: string }
  ) => ReadableStream<string> | AsyncIterable<string>;
  destroy?: () => void;
};

export const SUMMARIZER_DEFAULT_OPTS = {
  type: "key-points" as const,
  format: "plain-text" as const,
  length: "medium" as const,
  outputLanguage: "en",
};

export async function summarizerAvailability(
  options: Record<string, unknown> = SUMMARIZER_DEFAULT_OPTS
): Promise<Availability> {
  const ctor = getSummarizerCtor();
  if (!ctor) return "unavailable";
  try {
    if (typeof ctor.availability === "function") {
      return asAvailability(await ctor.availability(options));
    }
    return "available";
  } catch {
    return "unavailable";
  }
}

export async function isSummarizerUsable(): Promise<boolean> {
  return isUsable(await summarizerAvailability());
}

export async function createBrowserSummarizer(opts: {
  signal?: AbortSignal;
  onProgress?: ProgressFn;
  options?: Record<string, unknown>;
} = {}): Promise<BrowserSummarizer | null> {
  const ctor = getSummarizerCtor();
  if (!ctor) return null;
  throwIfAborted(opts.signal);
  const options = { ...SUMMARIZER_DEFAULT_OPTS, ...opts.options };
  const avail = await summarizerAvailability(options);
  if (!isUsable(avail)) return null;

  try {
    opts.onProgress?.(8, "Starting Browser Summarizer API…");
    const summarizer = await ctor.create({
      ...options,
      signal: opts.signal,
      monitor(m: EventTarget) {
        m.addEventListener("downloadprogress", ((e: Event) => {
          const ev = e as unknown as { loaded?: number };
          if (typeof ev.loaded === "number") {
            const pct = Math.min(40, Math.round(ev.loaded * 40));
            opts.onProgress?.(
              pct,
              `Downloading browser summarizer… ${Math.round(ev.loaded * 100)}%`
            );
          }
        }) as EventListener);
      },
    });
    throwIfAborted(opts.signal);
    return summarizer;
  } catch {
    return null;
  }
}
