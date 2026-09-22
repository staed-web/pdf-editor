import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "All PDF tools",
  description: "Browse every InstantPDFEdit tool — merge, split, compress, convert, edit, sign, and more. Private, in-browser processing.",
  path: "/tools",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
