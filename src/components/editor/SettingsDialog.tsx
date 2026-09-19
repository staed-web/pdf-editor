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
import { useThemeStore, type ThemeMode } from "@/lib/theme/theme-store";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: ThemeMode[] = ["light", "dark"];

export function SettingsDialog() {
  const open = useEditorStore((s) => s.settingsOpen);
  const setDialog = useEditorStore((s) => s.setDialog);
  const settings = useEditorStore((s) => s.settings);
  const updateSettings = useEditorStore((s) => s.updateSettings);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

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
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMode(t)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs capitalize transition-colors",
                    mode === t
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-amber-500/40 hover:text-foreground"
                  )}
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
              <p className="text-[10px] text-[var(--muted)]">Burn field values into page content</p>
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
