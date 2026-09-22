import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "InstantPDFEdit is a privacy-first, client-side PDF suite — every tool instantly, without uploading your files for core processing.",
  path: "/about",
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
