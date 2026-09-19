"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/store/editorStore";

export function SignatureDialog() {
  const open = useEditorStore((s) => s.signatureOpen);
  const setDialog = useEditorStore((s) => s.setDialog);
  const draft = useEditorStore((s) => s.draft);
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const setDraft = useEditorStore((s) => s.setDraft);
  const settings = useEditorStore((s) => s.settings);
  const currentPage = useEditorStore((s) => s.currentPage);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, [open, mode]);

  const place = (dataUrl?: string, text?: string) => {
    const base = draft?.type === "signature" ? draft : null;
    addAnnotation({
      id: base?.id || uuid(),
      type: "signature",
      pageIndex: base?.pageIndex ?? currentPage,
      x: (base as { x?: number })?.x ?? 72,
      y: (base as { y?: number })?.y ?? 72,
      w: 180,
      h: 60,
      color: settings.defaultColor,
      opacity: 1,
      strokeWidth: 2,
      createdAt: Date.now(),
      dataUrl,
      text,
      fontSize: 28,
    });
    setDraft(null);
    setDialog("signatureOpen", false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setDialog("signatureOpen", o);
        if (!o) setDraft(null);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Signature</DialogTitle>
          <DialogDescription>Draw or type a signature, then place it on the page.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "draw" ? "default" : "secondary"}
            onClick={() => setMode("draw")}
          >
            Draw
          </Button>
          <Button
            size="sm"
            variant={mode === "type" ? "default" : "secondary"}
            onClick={() => setMode("type")}
          >
            Type
          </Button>
        </div>
        {mode === "draw" ? (
          <canvas
            ref={canvasRef}
            width={400}
            height={160}
            className="w-full cursor-crosshair rounded-lg border border-zinc-700 bg-white"
            onPointerDown={(e) => {
              drawing.current = true;
              const canvas = canvasRef.current!;
              const rect = canvas.getBoundingClientRect();
              const ctx = canvas.getContext("2d")!;
              ctx.beginPath();
              ctx.moveTo(
                ((e.clientX - rect.left) / rect.width) * canvas.width,
                ((e.clientY - rect.top) / rect.height) * canvas.height
              );
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              const canvas = canvasRef.current!;
              const rect = canvas.getBoundingClientRect();
              const ctx = canvas.getContext("2d")!;
              ctx.lineTo(
                ((e.clientX - rect.left) / rect.width) * canvas.width,
                ((e.clientY - rect.top) / rect.height) * canvas.height
              );
              ctx.stroke();
            }}
            onPointerUp={() => {
              drawing.current = false;
            }}
          />
        ) : (
          <div>
            <Label>Your name</Label>
            <Input
              className="mt-1 font-serif text-2xl italic"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext("2d")!;
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
              setTyped("");
            }}
          >
            Clear
          </Button>
          <Button
            onClick={() => {
              if (mode === "draw" && canvasRef.current) {
                place(canvasRef.current.toDataURL("image/png"));
              } else if (typed.trim()) {
                place(undefined, typed.trim());
              }
            }}
          >
            Place signature
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
