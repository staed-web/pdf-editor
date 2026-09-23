"use client";

import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";

export default function AboutPage() {
  return (
    <LegalPage
      title="About InstantPDFEdit"
      subtitle="Every PDF tool. Instantly. Private by default."
    >
      <p>
        InstantPDFEdit is a privacy-first PDF suite that runs in your browser.
        Merge, split, compress, convert, annotate, sign, protect, OCR, and more —
        without creating an account and without uploading your files to our
        servers for core tools.
      </p>

      <h2>Mission</h2>
      <p>
        Document tools should feel instant and respectful. Too many “free PDF”
        sites quietly upload everything to a cloud queue. We built InstantPDFEdit
        so the default path is <strong>processing on your device</strong>: your
        file bytes stay in the browser tab and are never uploaded to our
        servers for core tools.
      </p>

      <h2>What you get</h2>
      <ul>
        <li>
          A full <Link href="/edit">PDF editor</Link> for annotate, sign,
          rearrange, and export.
        </li>
        <li>
          A large <Link href="/tools">tool hub</Link> with focused one-job
          pages and honest “best effort” labels where conversion cannot be
          perfect client-side.
        </li>
        <li>
          Optional install as a Progressive Web App for a cleaner app chrome and
          offline shell — without turning the public website into a fake native
          frame.
        </li>
      </ul>

      <h2>What we are not</h2>
      <p>
        We are not a document cloud, not an enterprise DMS, and not a paid
        e-sign network. Features like signature request packs or extractive Q&amp;A
        are deliberate free/local alternatives — not drop-in replacements for
        DocuSign or ChatGPT over your files.
      </p>

      <h2>Trust</h2>
      <p>
        Read our <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/terms">Terms</Link>. Questions:{" "}
        <Link href="/contact">Contact</Link>.
      </p>
    </LegalPage>
  );
}
