import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact privacy note used where an ad slot would sit before AdSense
 * approval / slot IDs are configured. Soft, non-spammy — not an upsell.
 */
export function PrivacySoftCta({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "mx-auto flex w-full max-w-3xl items-start gap-2.5 rounded-2xl border border-[var(--hairline)] bg-[var(--card)]/80 px-3.5 py-2.5 shadow-[var(--shadow-sm)] sm:items-center sm:px-4 sm:py-3",
        "dark:bg-[var(--panel)]/80",
        className
      )}
      aria-label="Privacy note"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 sm:mt-0">
        <Shield className="h-3.5 w-3.5" aria-hidden />
      </span>
      <p className="min-w-0 text-[13px] leading-snug text-[var(--muted)] sm:text-sm">
        <span className="font-medium text-foreground/85">
          Your files stay in this browser.
        </span>{" "}
        We never upload your PDFs for core tools — unlike sites that send
        documents to a server first.
      </p>
    </aside>
  );
}
