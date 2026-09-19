"use client";

import { useEffect, useState } from "react";
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
import { MobileToolsBar } from "./MobileToolsBar";
import { MobilePagesDrawer } from "./MobilePagesDrawer";

export function EditorShell() {
  const pdfBytes = useEditorStore((s) => s.pdfBytes);
  const initSettings = useEditorStore((s) => s.initSettings);
  const [pagesOpen, setPagesOpen] = useState(false);
  useKeyboardShortcuts();

  useEffect(() => {
    void initSettings();
  }, [initSettings]);

  return (
    <div className="editor-shell flex h-dvh flex-col overflow-hidden overscroll-none bg-background text-foreground">
      <ThemeSync />
      <div className="safe-pt shrink-0">
        <TopToolbar />
      </div>
      <div className="flex min-h-0 flex-1 touch-pan-y">
        {pdfBytes ? (
          <>
            <div className="hidden md:contents">
              <ToolsRail />
              <ThumbnailSidebar />
            </div>
            <Viewer />
            <div className="hidden lg:contents">
              <PropertiesPanel />
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
      {pdfBytes ? <MobileToolsBar onOpenPages={() => setPagesOpen(true)} /> : null}
      <div className="hidden md:block">
        <StatusBar />
      </div>
      <MobilePagesDrawer open={pagesOpen} onClose={() => setPagesOpen(false)} />
      <SignatureDialog />
      <SettingsDialog />
      <ShortcutsDialog />
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        offset={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
        mobileOffset={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      />
    </div>
  );
}
