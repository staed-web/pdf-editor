import type { ToolLanding } from "@/lib/tool-landing";

/** Visible Q&A so tool landings are indexable, not schema-only. */
export function ToolFaq({ landing }: { landing: ToolLanding }) {
  return (
    <section
      className="mt-10 border-t border-[var(--hairline)] pt-8"
      aria-labelledby={`faq-${landing.slug}`}
    >
      <h2
        id={`faq-${landing.slug}`}
        className="text-lg font-semibold tracking-tight text-foreground"
      >
        Questions
      </h2>
      <div className="mt-4 space-y-4">
        {landing.faqs.map((item) => (
          <div key={item.q}>
            <h3 className="text-sm font-semibold text-foreground">{item.q}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
