import Link from "next/link";
import { Logo } from "./Logo";
import { CATEGORY_ORDER, CATEGORY_LABELS, toolsByCategory } from "@/lib/tools";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--panel)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Every PDF tool. Instantly. Private workspace — files stay in your browser.
          </p>
        </div>
        {CATEGORY_ORDER.slice(0, 3).map((cat) => (
          <div key={cat}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {CATEGORY_LABELS[cat]}
            </p>
            <ul className="space-y-2">
              {toolsByCategory(cat).slice(0, 6).map((t) => (
                <li key={t.slug}>
                  <Link
                    href={t.href}
                    className="text-sm text-foreground/70 hover:text-amber-700 dark:hover:text-amber-400"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-4 py-4 text-center text-xs text-[var(--muted)]">
        © {new Date().getFullYear()} InstantPDFEdit · Processed locally · No account required
      </div>
    </footer>
  );
}
