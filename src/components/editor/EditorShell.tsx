"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useEditorStore } from "@/store/editorStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { TopToolbar } from "./TopToolbar";
import { ToolsRail } from "./ToolsRail";
import { ThumbnailSidebar } from "./ThumbnailSidebar";
import { PropertiesPanel } from "./PropertiesPanel";
import { StatusBar } from "./StatusBar";
import { Viewer } from "./Viewer";
import { EmptyState } from "./EmptyState";
import { SignatureDialog } from "./SignatureDialog";
import { SettingsDialog } from "./SettingsDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { ThemeSync } from "./ThemeSync";

export function EditorShell() {
  const pdfBytes = useEditorStore((s) => s.pdfBytes);
  const initSettings = useEditorStore((s) => s.initSettings);
  useKeyboardShortcuts();

  useEffect(() => {
    void initSettings();
  }, [initSettings]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <ThemeSync />
      <TopToolbar />
      <div className="flex min-h-0 flex-1">
        {pdfBytes ? (
          <>
            <ToolsRail />
            <ThumbnailSidebar />
            <Viewer />
            <PropertiesPanel />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
      <StatusBar />
      <SignatureDialog />
      <SettingsDialog />
      <ShortcutsDialog />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
