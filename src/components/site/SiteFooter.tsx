import Link from "next/link";
import { Logo } from "./Logo";
import { CATEGORY_ORDER, CATEGORY_LABELS, toolsByCategory } from "@/lib/tools";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Every PDF tool. Instantly. Private workspace — files stay in your browser.
          </p>
        </div>
        {CATEGORY_ORDER.slice(0, 3).map((cat) => (
          <div key={cat}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {CATEGORY_LABELS[cat]}
            </p>
            <ul className="space-y-2">
              {toolsByCategory(cat).slice(0, 6).map((t) => (
                <li key={t.slug}>
                  <Link
                    href={t.href}
                    className="text-sm text-zinc-600 hover:text-amber-700 dark:text-zinc-400 dark:hover:text-amber-400"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 px-4 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        © {new Date().getFullYear()} InstantPDFEdit · Processed locally · No account required
      </div>
    </footer>
  );
}
