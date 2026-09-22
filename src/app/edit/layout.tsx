import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "PDF Editor",
  description: "Annotate, sign, rearrange, and export PDFs in your browser. InstantPDFEdit’s flagship private editor.",
  path: "/edit",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
