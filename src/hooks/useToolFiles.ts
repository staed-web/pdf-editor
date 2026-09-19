"use client";

import { useCallback, useState } from "react";
import type { QueueFile } from "@/components/tools/FileQueue";

function rid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `f-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useToolFiles() {
  const [files, setFiles] = useState<QueueFile[]>([]);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        id: rid(),
        file,
        name: file.name,
        size: file.size,
      })),
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const reorder = useCallback((from: number, to: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const clear = useCallback(() => setFiles([]), []);

  return { files, addFiles, remove, reorder, clear, setFiles };
}
