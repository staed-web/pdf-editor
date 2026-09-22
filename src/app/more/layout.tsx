import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "More",
  description: "Settings, install, and more from InstantPDFEdit.",
  path: "/more",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
