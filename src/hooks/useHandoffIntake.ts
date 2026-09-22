"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { consumeHandoff, type HandoffIntent } from "@/lib/storage/handoff";

/**
 * On mount, if another tool stored a result for this route, deliver it once.
 */
export function useHandoffIntake(
  href: string,
  onFile: (file: File, intent: HandoffIntent) => void | Promise<void>
) {
  const handled = useRef(false);
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    void (async () => {
      const payload = await consumeHandoff(href);
      if (!payload) return;
      try {
        await onFileRef.current(payload.file, payload.intent);
        toast.success(`Loaded “${payload.meta.name}” from previous step`);
      } catch {
        toast.error("Could not load handed-off file");
      }
    })();
  }, [href]);
}
