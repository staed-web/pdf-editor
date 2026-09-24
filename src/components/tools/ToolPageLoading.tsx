/** Shared loading shell for dynamically imported heavy tool pages. */
export function ToolPageLoading({ label = "Loading tool…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 bg-background px-4 text-sm text-[var(--muted)]">
      <div className="h-10 w-10 animate-pulse rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600" />
      {label}
    </div>
  );
}
