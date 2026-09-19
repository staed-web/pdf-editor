"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
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
  const pages = useEditorStore((s) => s.pages);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<"draw" | "type" | "upload">("draw");
  const [typed, setTyped] = useState("");
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const hasInk = useRef(false);

  useEffect(() => {
    if (!open) return;
    hasInk.current = false;
    setUploadUrl(null);
    const canvas = canvasRef.current;
    if (!canvas || mode !== "draw") return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [open, mode]);

  const place = (dataUrl?: string, text?: string) => {
    if (!dataUrl && !text?.trim()) {
      toast.error("Draw, type, or upload a signature first");
      return;
    }
    const base = draft?.type === "signature" ? draft : null;
    const page = pages[currentPage];
    const defaultW = 180;
    const defaultH = 60;
    const fallbackX = page ? Math.max(24, (page.width - defaultW) / 2) : 72;
    const fallbackY = page ? Math.max(24, (page.height - defaultH) / 2) : 72;
    try {
      addAnnotation({
        id: (base as { id?: string })?.id || uuid(),
        type: "signature",
        pageIndex: (base as { pageIndex?: number })?.pageIndex ?? currentPage,
        x: (base as { x?: number })?.x ?? fallbackX,
        y: (base as { y?: number })?.y ?? fallbackY,
        w: (base as { w?: number })?.w ?? defaultW,
        h: (base as { h?: number })?.h ?? defaultH,
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
      setTyped("");
      setUploadUrl(null);
      hasInk.current = false;
      toast.success("Signature placed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place signature");
    }
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
          <DialogDescription>
            Draw, type, or upload a signature, then place it on the page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          {(["draw", "type", "upload"] as const).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "secondary"}
              onClick={() => setMode(m)}
              className="capitalize"
            >
              {m}
            </Button>
          ))}
        </div>
        {mode === "draw" ? (
          <canvas
            ref={canvasRef}
            width={400}
            height={160}
            className="w-full touch-none cursor-crosshair rounded-lg border border-[var(--border)] bg-white"
            onPointerDown={(e) => {
              drawing.current = true;
              hasInk.current = true;
              const canvas = canvasRef.current!;
              canvas.setPointerCapture(e.pointerId);
              const rect = canvas.getBoundingClientRect();
              const ctx = canvas.getContext("2d")!;
              ctx.strokeStyle = "#111";
              ctx.lineWidth = 2;
              ctx.lineCap = "round";
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
        ) : mode === "type" ? (
          <div>
            <Label>Your name</Label>
            <Input
              className="mt-1 font-serif text-2xl italic"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 2_000_000) {
                  toast.error("Image must be under 2 MB");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setUploadUrl(String(reader.result));
                };
                reader.onerror = () => toast.error("Could not read image");
                reader.readAsDataURL(file);
              }}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              Choose image…
            </Button>
            {uploadUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={uploadUrl}
                alt="Signature preview"
                className="mx-auto max-h-28 rounded border border-[var(--border)] bg-white object-contain p-2"
              />
            )}
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
              setUploadUrl(null);
              hasInk.current = false;
            }}
          >
            Clear
          </Button>
          <Button
            onClick={() => {
              if (mode === "draw" && canvasRef.current) {
                if (!hasInk.current) {
                  toast.error("Draw a signature first");
                  return;
                }
                place(canvasRef.current.toDataURL("image/png"));
              } else if (mode === "type" && typed.trim()) {
                place(undefined, typed.trim());
              } else if (mode === "upload" && uploadUrl) {
                place(uploadUrl);
              } else {
                toast.error("Add a signature before placing");
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
