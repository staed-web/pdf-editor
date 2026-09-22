import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How InstantPDFEdit handles files, browser storage, ads, and analytics. Core PDF tools process locally — files are not uploaded to our servers.",
  path: "/privacy",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
