import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "Terms for using InstantPDFEdit’s free local PDF tools — no warranty, acceptable use, IP, and liability.",
  path: "/terms",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
