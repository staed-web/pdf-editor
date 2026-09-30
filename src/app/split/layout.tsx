import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageJsonLd, toolLandingMetadata } from "@/lib/seo";

export const metadata: Metadata = toolLandingMetadata("split");

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={faqPageJsonLd("split")} />
      {children}
    </>
  );
}
