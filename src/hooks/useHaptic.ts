"use client";

export function haptic(kind: "light" | "medium" | "success" = "light") {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    if (kind === "light") navigator.vibrate(8);
    else if (kind === "medium") navigator.vibrate(16);
    else navigator.vibrate([10, 40, 10]);
  } catch {
    /* ignore */
  }
}
