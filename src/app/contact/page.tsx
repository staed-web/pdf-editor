"use client";

import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";

const SUPPORT_EMAIL = "hello@instantpdfedit.com";

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      subtitle="No ticket system — honest expectations for a free local toolkit."
    >
      <p>
        InstantPDFEdit is a free, local-first product. We do not run a customer
        support portal, live chat, or guaranteed SLA. For product questions,
        privacy notes, or partnership ideas, email is the right channel.
      </p>

      <h2>Email</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}?subject=InstantPDFEdit%20support`}>
          {SUPPORT_EMAIL}
        </a>
      </p>
      <p>
        We read messages when we can. Please do not attach confidential PDFs
        unless we specifically ask — email is not a private processing pipeline,
        and our tools are designed so you never need to send us the file.
      </p>

      <h2>What to include</h2>
      <ul>
        <li>Browser and device (e.g. Chrome on macOS).</li>
        <li>
          The tool URL (for example <code className="rounded bg-[var(--panel)] px-1">/merge</code> or{" "}
          <code className="rounded bg-[var(--panel)] px-1">/edit</code>).
        </li>
        <li>
          What you expected vs what happened — without sensitive document
          contents.
        </li>
      </ul>

      <h2>Self-serve</h2>
      <ul>
        <li>
          <Link href="/tools">All tools</Link>
        </li>
        <li>
          <Link href="/privacy">Privacy Policy</Link>
        </li>
        <li>
          <Link href="/#faq">Homepage FAQ</Link>
        </li>
      </ul>
    </LegalPage>
  );
}
