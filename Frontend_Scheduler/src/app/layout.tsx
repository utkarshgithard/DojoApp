import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { cn } from "@/lib/utils";
import JsonLd from "@/components/JsonLd";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import InstallAppPrompt from "@/components/InstallAppPrompt";

export const metadata: Metadata = {
  metadataBase: new URL("https://dojoclass.space"),
  title: {
    default: "DojoClass | The Internet of the Students",
    template: "%s | DojoClass",
  },
  description:
    "Track your college attendance by subject, plan weekly schedules, and never fall below 75%. Free smart attendance tracker app built for students.",
  keywords: [
    "attendance tracker",
    "college attendance app",
    "student attendance tracker",
    "75 percent attendance",
    "class tracker",
    "schedule planner",
    "bunk calculator",
    "attendance manager",
    "DojoClass",
    "college attendance calculator",
  ],
  authors: [{ name: "DojoClass Team" }],
  creator: "DojoClass",
  publisher: "DojoClass",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://dojoclass.space",
    siteName: "DojoClass",
    title: "DojoClass | The Internet of the Students",
    description:
      "Track your college attendance by subject, plan weekly schedules, and never fall below 75%. Free for all students.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DojoClass | The Internet of the Students",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DojoClass | The Internet of the Students",
    description:
      "Track your college attendance by subject, plan weekly schedules, and never fall below 75%.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://dojoclass.space",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <meta name="google-site-verification" content="MH-qCpIalYR4S1flnD1CRaPx_tUMSziNE9Y6cLpgdnI" />
        {/* App-wide fonts: Raleway (sans) + Roboto Slab (serif headings) */}
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&family=Roboto+Slab:wght@100..900&display=swap');`}</style>
      </head>
      <body>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4754795190999007"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VLYRZN8KEK"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VLYRZN8KEK');
          `}
        </Script>
        <ServiceWorkerRegistrar />
        <InstallAppPrompt />
        <JsonLd />
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
