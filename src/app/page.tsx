import type { Metadata } from "next";
import { pageMetadata, homeJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import HomePageClient from "@/components/home/HomePageClient";

export const metadata: Metadata = pageMetadata({
  title: "InstantPDFEdit — Every PDF tool. Instantly.",
  description:
    "Merge, split, compress, convert, edit, sign, and protect PDFs entirely in your browser. Private workspace — files never uploaded.",
  path: "/",
  absoluteTitle: "InstantPDFEdit — Every PDF tool. Instantly.",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <HomePageClient />
    </>
  );
}
