import type { Metadata } from "next";
import type { ReactNode } from "react";
import { toolMetadata } from "@/lib/seo";

export const metadata: Metadata = toolMetadata("png-to-pdf");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
