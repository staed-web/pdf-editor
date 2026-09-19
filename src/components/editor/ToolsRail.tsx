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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "@/store/editorStore";
import type { Tool } from "@/store/types";
import { cn } from "@/lib/utils";

const GROUPS: { tools: { id: Tool; icon: React.ElementType; label: string; shortcut?: string }[] }[] = [
  {
    tools: [
      { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
      { id: "pan", icon: Hand, label: "Pan", shortcut: "H" },
    ],
  },
  {
    tools: [
      { id: "highlight", icon: Highlighter, label: "Highlight", shortcut: "M" },
      { id: "underline", icon: Underline, label: "Underline" },
      { id: "strikethrough", icon: Strikethrough, label: "Strikethrough" },
      { id: "pen", icon: Pen, label: "Pen", shortcut: "P" },
    ],
  },
  {
    tools: [
      { id: "note", icon: StickyNote, label: "Sticky note", shortcut: "N" },
      { id: "textbox", icon: Type, label: "Text box", shortcut: "T" },
    ],
  },
  {
    tools: [
      { id: "rect", icon: Square, label: "Rectangle", shortcut: "R" },
      { id: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
      { id: "arrow", icon: MoveUpRight, label: "Arrow" },
      { id: "line", icon: Minus, label: "Line", shortcut: "L" },
    ],
  },
  {
    tools: [
      { id: "stamp", icon: Stamp, label: "Stamp" },
      { id: "signature", icon: Signature, label: "Signature", shortcut: "S" },
      { id: "form", icon: FormInput, label: "Fill forms" },
    ],
  },
];

export function ToolsRail() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const setDialog = useEditorStore((s) => s.setDialog);

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-[var(--border)] bg-[var(--card)]/90 py-3 backdrop-blur">
        {GROUPS.map((g, gi) => (
          <div key={gi} className="flex w-full flex-col items-center gap-1 px-2">
            {gi > 0 && <Separator className="my-1.5 w-8" />}
            {g.tools.map((t) => {
              const Icon = t.icon;
              return (
                <Tooltip key={t.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="tool"
                      data-active={tool === t.id}
                      aria-label={t.label}
                      aria-pressed={tool === t.id}
                      onClick={() => {
                        setTool(t.id);
                        // Signature is placed after the dialog; click a page for position, or dialog uses defaults.
                        if (t.id === "signature") setDialog("signatureOpen", true);
                      }}
                      className={cn(tool === t.id && "shadow-inner")}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t.label}
                    {t.shortcut ? ` (${t.shortcut})` : ""}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </aside>
    </TooltipProvider>
  );
}
