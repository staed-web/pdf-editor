"use client";

import {
  MousePointer2,
  Hand,
  Highlighter,
  Underline,
  Strikethrough,
  Pen,
  StickyNote,
  Type,
  Square,
  Circle,
  MoveUpRight,
  Minus,
  Stamp,
  Signature,
  FormInput,
  Layers,
} from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import type { Tool } from "@/store/types";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/useHaptic";

const TOOLS: { id: Tool; icon: React.ElementType; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "pan", icon: Hand, label: "Pan" },
  { id: "highlight", icon: Highlighter, label: "Highlight" },
  { id: "underline", icon: Underline, label: "Underline" },
  { id: "strikethrough", icon: Strikethrough, label: "Strike" },
  { id: "pen", icon: Pen, label: "Pen" },
  { id: "note", icon: StickyNote, label: "Note" },
  { id: "textbox", icon: Type, label: "Text" },
  { id: "rect", icon: Square, label: "Rect" },
  { id: "ellipse", icon: Circle, label: "Ellipse" },
  { id: "arrow", icon: MoveUpRight, label: "Arrow" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "stamp", icon: Stamp, label: "Stamp" },
  { id: "signature", icon: Signature, label: "Sign" },
  { id: "form", icon: FormInput, label: "Form" },
];

export function MobileToolsBar({ onOpenPages }: { onOpenPages?: () => void }) {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const setDialog = useEditorStore((s) => s.setDialog);

  return (
    <div
      className="flex shrink-0 items-stretch gap-1.5 border-t border-[var(--hairline)] px-2 py-2 md:hidden"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        background: "var(--glass)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
      }}
    >
      <button
        type="button"
        onClick={() => {
          haptic("light");
          onOpenPages?.();
        }}
        className="touch-target flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-[var(--hairline)] bg-[var(--card)] text-[9px] font-semibold text-[var(--muted)] shadow-[var(--shadow-sm)]"
      >
        <Layers className="h-4 w-4" />
        Pages
      </button>
      <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              aria-pressed={active}
              onClick={() => {
                haptic("light");
                setTool(t.id);
                if (t.id === "signature") setDialog("signatureOpen", true);
              }}
              className={cn(
                "touch-target flex h-12 min-w-[3.35rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[9px] font-semibold transition-colors",
                active
                  ? "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/35 dark:text-amber-300"
                  : "text-[var(--muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
