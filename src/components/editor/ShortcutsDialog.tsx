"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useEditorStore } from "@/store/editorStore";

const SHORTCUTS = [
  ["V", "Select tool"],
  ["H", "Pan tool"],
  ["M", "Highlight"],
  ["P", "Pen"],
  ["T", "Text box"],
  ["N", "Sticky note"],
  ["R", "Rectangle"],
  ["O", "Ellipse"],
  ["L", "Line"],
  ["S", "Signature"],
  ["⌘ / Ctrl + Z", "Undo"],
  ["⌘ / Ctrl + ⇧ + Z", "Redo"],
  ["⌘ / Ctrl + F", "Search"],
  ["⌘ / Ctrl + S", "Export"],
  ["Delete / Backspace", "Delete selection"],
  ["+", "Zoom in"],
  ["−", "Zoom out"],
  ["0", "Reset zoom 100%"],
  ["← / →", "Prev / next page"],
];

export function ShortcutsDialog() {
  const open = useEditorStore((s) => s.shortcutsOpen);
  const setDialog = useEditorStore((s) => s.setDialog);

  return (
    <Dialog open={open} onOpenChange={(o) => setDialog("shortcutsOpen", o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Speed up your editing workflow.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-[50vh] space-y-1.5 overflow-auto pr-1">
          {SHORTCUTS.map(([key, label]) => (
            <li key={key} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-400">{label}</span>
              <kbd className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-zinc-200">
                {key}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
