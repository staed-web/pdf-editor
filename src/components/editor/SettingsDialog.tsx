"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEditorStore } from "@/store/editorStore";

export function SettingsDialog() {
  const open = useEditorStore((s) => s.settingsOpen);
  const setDialog = useEditorStore((s) => s.setDialog);
  const settings = useEditorStore((s) => s.settings);
  const updateSettings = useEditorStore((s) => s.updateSettings);

  return (
    <Dialog open={open} onOpenChange={(o) => setDialog("settingsOpen", o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Preferences are saved locally in your browser.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Theme</Label>
            <div className="mt-2 flex gap-2">
              {(["system", "light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className={`rounded-lg border px-3 py-1.5 text-xs capitalize ${
                    settings.theme === t
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-zinc-700 text-zinc-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Show thumbnails</Label>
            <Switch
              checked={settings.showThumbnails}
              onCheckedChange={(v) => updateSettings({ showThumbnails: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show properties</Label>
            <Switch
              checked={settings.showProperties}
              onCheckedChange={(v) => updateSettings({ showProperties: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Flatten forms on export</Label>
              <p className="text-[10px] text-zinc-500">Burn field values into page content</p>
            </div>
            <Switch
              checked={settings.flattenFormsOnExport}
              onCheckedChange={(v) => updateSettings({ flattenFormsOnExport: v })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
