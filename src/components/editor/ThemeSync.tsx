"use client";

/**
 * Legacy bridge: editor previously drove html.dark via editorStore.settings.theme.
 * Site theme (useThemeStore / instantpdfedit-theme) is now the single source of truth.
 * This component is intentionally a no-op so EditorShell keep importing it safely.
 */
export function ThemeSync() {
  return null;
}
