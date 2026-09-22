import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description: "InstantPDFEdit is free for client-side PDF tools. No account required.",
  path: "/pricing",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
