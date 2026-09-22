import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Contact InstantPDFEdit by email. No fake ticket system — honest support expectations for a free local PDF suite.",
  path: "/contact",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
