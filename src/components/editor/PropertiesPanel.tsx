"use client";

import { HexColorPicker } from "react-colorful";
import { useEditorStore } from "@/store/editorStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { STAMP_PRESETS } from "@/store/types";
import { cn } from "@/lib/utils";

export function PropertiesPanel() {
  const show = useEditorStore((s) => s.settings.showProperties);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const annotations = useEditorStore((s) => s.annotations);
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const settings = useEditorStore((s) => s.settings);
  const updateSettings = useEditorStore((s) => s.updateSettings);
  const tool = useEditorStore((s) => s.tool);
  const stampLabel = useEditorStore((s) => s.stampLabel);
  const setStampLabel = useEditorStore((s) => s.setStampLabel);
  const formValues = useEditorStore((s) => s.formValues);
  const setFormValue = useEditorStore((s) => s.setFormValue);

  if (!show) return null;

  const selected = annotations.filter((a) => selectedIds.includes(a.id));
  const ann = selected[0];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--panel)]">
      <div className="border-b border-[var(--border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Properties
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-3">
          {ann ? (
            <>
              <div>
                <Label>Type</Label>
                <p className="mt-1 text-sm capitalize text-zinc-200">{ann.type}</p>
              </div>
              <div>
                <Label>Color</Label>
                <div className="mt-2">
                  <HexColorPicker
                    color={ann.color}
                    onChange={(c) => {
                      // Snapshot once per gesture via past check would flood; update live without history spam.
                      updateAnnotation(ann.id, { color: c });
                    }}
                    className="!w-full"
                  />
                </div>
              </div>
              <div>
                <Label>Opacity · {Math.round(ann.opacity * 100)}%</Label>
                <Slider
                  className="mt-2"
                  value={[ann.opacity]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => updateAnnotation(ann.id, { opacity: v })}
                />
              </div>
              {"strokeWidth" in ann && (
                <div>
                  <Label>Stroke · {ann.strokeWidth}px</Label>
                  <Slider
                    className="mt-2"
                    value={[ann.strokeWidth]}
                    min={1}
                    max={12}
                    step={1}
                    onValueChange={([v]) => updateAnnotation(ann.id, { strokeWidth: v })}
                  />
                </div>
              )}
              {ann.type === "textbox" && (
                <div>
                  <Label>Text</Label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-sm text-foreground"
                    rows={3}
                    value={ann.text}
                    onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                  />
                </div>
              )}
              {ann.type === "note" && (
                <div>
                  <Label>Note</Label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-sm text-foreground"
                    rows={3}
                    value={ann.text}
                    onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                  />
                </div>
              )}
              {ann.type === "stamp" && (
                <div>
                  <Label>Stamp label</Label>
                  <Input
                    className="mt-1"
                    value={ann.label}
                    onChange={(e) => updateAnnotation(ann.id, { label: e.target.value })}
                  />
                </div>
              )}
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                Delete
              </Button>
            </>
          ) : (
            <>
              <div>
                <Label>Default color</Label>
                <div className="mt-2">
                  <HexColorPicker
                    color={settings.defaultColor}
                    onChange={(c) => updateSettings({ defaultColor: c })}
                    className="!w-full"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["#F59E0B", "#EF4444", "#22C55E", "#3B82F6", "#A855F7", "#111827"].map(
                    (c) => (
                      <button
                        key={c}
                        className={cn(
                          "h-6 w-6 rounded-full ring-offset-2 ring-offset-zinc-950",
                          settings.defaultColor === c && "ring-2 ring-amber-400"
                        )}
                        style={{ background: c }}
                        onClick={() => updateSettings({ defaultColor: c })}
                      />
                    )
                  )}
                </div>
              </div>
              <div>
                <Label>Stroke · {settings.defaultStrokeWidth}px</Label>
                <Slider
                  className="mt-2"
                  value={[settings.defaultStrokeWidth]}
                  min={1}
                  max={12}
                  step={1}
                  onValueChange={([v]) => updateSettings({ defaultStrokeWidth: v })}
                />
              </div>
              <div>
                <Label>Highlight opacity · {Math.round(settings.defaultOpacity * 100)}%</Label>
                <Slider
                  className="mt-2"
                  value={[settings.defaultOpacity]}
                  min={0.1}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => updateSettings({ defaultOpacity: v })}
                />
              </div>
              {tool === "stamp" && (
                <div>
                  <Label>Stamp preset</Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {STAMP_PRESETS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStampLabel(s)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-[10px] font-bold tracking-wide",
                          stampLabel === s
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                            : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(tool === "form" || formValues.length > 0) && (
                <div>
                  <Label>Form fields ({formValues.length})</Label>
                  <div className="mt-2 space-y-2">
                    {formValues.length === 0 && (
                      <p className="text-xs text-zinc-500">No AcroForm fields detected.</p>
                    )}
                    {formValues.map((f) => (
                      <div key={f.name}>
                        <p className="mb-1 truncate text-[10px] text-zinc-500">{f.name}</p>
                        <Input
                          value={f.value}
                          onChange={(e) => setFormValue(f.name, e.target.value)}
                          placeholder={f.type}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs leading-relaxed text-zinc-500">
                Select an annotation to edit its properties, or adjust defaults for new marks.
              </p>
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
