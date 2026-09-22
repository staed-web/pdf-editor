"use client";

import { useCallback, useRef, useState } from "react";
import {
  classifyProcessError,
  type ProcessErrorInfo,
} from "@/lib/pdf/process-ux";

export function useProcessJob() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Processing…");
  const [error, setError] = useState<ProcessErrorInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const genRef = useRef(0);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setProgress(0);
    setError({
      kind: "cancelled",
      title: "Cancelled",
      message: "Processing was cancelled.",
      hint: "Your files stayed on this device. Try again when ready.",
    });
  }, []);

  const resetError = useCallback(() => setError(null), []);

  const run = useCallback(
    async <T,>(
      fn: (ctx: {
        signal: AbortSignal;
        setProgress: (n: number) => void;
        setLabel: (s: string) => void;
        isCancelled: () => boolean;
      }) => Promise<T>
    ): Promise<T | null> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const gen = ++genRef.current;
      setBusy(true);
      setProgress(5);
      setProgressLabel("Processing…");
      setError(null);

      const isCancelled = () => ac.signal.aborted || gen !== genRef.current;

      try {
        const result = await fn({
          signal: ac.signal,
          setProgress: (n) => {
            if (!isCancelled()) setProgress(n);
          },
          setLabel: (s) => {
            if (!isCancelled()) setProgressLabel(s);
          },
          isCancelled,
        });
        if (isCancelled()) return null;
        setProgress(100);
        return result;
      } catch (e) {
        if (isCancelled() || (e instanceof Error && e.name === "AbortError")) {
          return null;
        }
        setError(classifyProcessError(e));
        return null;
      } finally {
        if (gen === genRef.current) {
          setBusy(false);
          abortRef.current = null;
        }
      }
    },
    []
  );

  return {
    busy,
    progress,
    progressLabel,
    error,
    setError,
    resetError,
    cancel,
    run,
    setProgress,
    setProgressLabel,
  };
}
