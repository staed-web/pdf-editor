"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Minimize2,
  Lock,
  PenTool,
  ScanText,
  Combine,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "sonner";
import {
  storeHandoff,
  type HandoffIntent,
} from "@/lib/storage/handoff";

export type NextStepAction = {
  id: string;
  label: string;
  href: string;
  intent?: HandoffIntent;
  icon?: "compress" | "protect" | "sign" | "ocr" | "merge" | "flatten" | "other";
};

const ICONS = {
  compress: Minimize2,
  protect: Lock,
  sign: PenTool,
  ocr: ScanText,
  merge: Combine,
  flatten: Layers,
  other: ArrowRight,
} as const;

/** Sensible secondary actions after a successful PDF tool run. */
export function defaultNextSteps(fromTool: string): NextStepAction[] {
  const all: Record<string, NextStepAction> = {
    compress: {
      id: "compress",
      label: "Compress result",
      href: "/compress",
      icon: "compress",
    },
    protect: {
      id: "protect",
      label: "Protect",
      href: "/protect",
      icon: "protect",
    },
    sign: {
      id: "sign",
      label: "Sign",
      href: "/edit",
      intent: "sign",
      icon: "sign",
    },
    ocr: {
      id: "ocr",
      label: "OCR",
      href: "/ocr",
      icon: "ocr",
    },
    flatten: {
      id: "flatten",
      label: "Flatten & lock",
      href: "/flatten",
      icon: "flatten",
    },
  };

  const presets: Record<string, string[]> = {
    merge: ["compress", "protect", "sign"],
    compress: ["protect", "sign"],
    ocr: ["compress", "protect", "sign"],
    protect: ["sign"],
    redact: ["compress", "protect", "sign"],
    "jpg-to-pdf": ["compress", "protect", "sign"],
    split: ["compress", "protect"],
    "fill-form": ["flatten", "sign", "protect"],
    sign: ["flatten", "protect"],
    flatten: ["protect", "sign"],
    "pdf-to-word": [],
    "pdf-to-jpg": [],
  };

  const ids = presets[fromTool] ?? ["compress", "protect", "sign"];
  return ids.map((id) => all[id]).filter(Boolean);
}

export function NextSteps({
  fromTool,
  fileName,
  blob,
  mime = "application/pdf",
  actions,
  className,
}: {
  fromTool: string;
  fileName: string;
  blob: Blob | Uint8Array | ArrayBuffer;
  mime?: string;
  actions?: NextStepAction[];
  className?: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const steps = (actions ?? defaultNextSteps(fromTool)).filter(
    (s) => s.id !== fromTool
  );

  if (!steps.length) return null;
  if (mime && mime !== "application/pdf") return null;

  const go = async (step: NextStepAction) => {
    setBusyId(step.id);
    haptic("light");
    try {
      await storeHandoff({
        data: blob,
        name: fileName,
        mime,
        fromTool,
        toHref: step.href,
        intent: step.intent || "open",
      });
      router.push(step.href);
    } catch {
      toast.error("Could not carry result to next tool");
      setBusyId(null);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        Next steps
      </p>
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => {
          const Icon = ICONS[step.icon || "other"];
          return (
            <Button
              key={step.id}
              type="button"
              size="sm"
              variant="outline"
              className="min-h-9 rounded-full border-emerald-300/80 bg-white/80 dark:border-emerald-800 dark:bg-zinc-950/50"
              disabled={busyId !== null}
              onClick={() => void go(step)}
            >
              <Icon className="h-3.5 w-3.5" />
              {busyId === step.id ? "Opening…" : step.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
