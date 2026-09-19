import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "InstantPDFEdit — Every PDF tool. Instantly.",
    template: "%s · InstantPDFEdit",
  },
  description:
    "Merge, split, compress, convert, edit, sign, and protect PDFs entirely in your browser. Private workspace — files never uploaded.",
  applicationName: "InstantPDFEdit",
  keywords: [
    "PDF editor",
    "merge PDF",
    "compress PDF",
    "PDF tools",
    "annotate PDF",
    "sign PDF",
    "privacy",
    "InstantPDFEdit",
  ],
  openGraph: {
    title: "InstantPDFEdit — Every PDF tool. Instantly.",
    description:
      "All-in-one private PDF suite. Files stay in your browser.",
    type: "website",
    siteName: "InstantPDFEdit",
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantPDFEdit",
    description: "Every PDF tool. Instantly. Private & in-browser.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('instantpdfedit-theme')||'light';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
