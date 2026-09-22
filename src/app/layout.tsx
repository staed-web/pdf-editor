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

const APP_NAME = "InstantPDFEdit";

export const metadata: Metadata = {
  title: {
    default: "InstantPDFEdit — Every PDF tool. Instantly.",
    template: "%s · InstantPDFEdit",
  },
  description:
    "Merge, split, compress, convert, edit, sign, and protect PDFs entirely in your browser. Private workspace — files never uploaded.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  keywords: [
    "PDF editor",
    "merge PDF",
    "compress PDF",
    "PDF tools",
    "annotate PDF",
    "sign PDF",
    "privacy",
    "InstantPDFEdit",
    "PWA",
  ],
  openGraph: {
    title: "InstantPDFEdit — Every PDF tool. Instantly.",
    description: "All-in-one private PDF suite. Files stay in your browser.",
    type: "website",
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantPDFEdit",
    description: "Every PDF tool. Instantly. Private & in-browser.",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;var t=localStorage.getItem('instantpdfedit-theme')||'light';if(t==='system'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';try{localStorage.setItem('instantpdfedit-theme',t);}catch(e){}}var d=t==='dark';r.classList.toggle('dark',d);r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light';var s=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||(navigator.standalone===true);r.dataset.standalone=s?'1':'0';if(s)r.classList.add('standalone');}catch(e){}})();`,
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
