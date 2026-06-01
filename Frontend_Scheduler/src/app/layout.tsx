import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { cn } from "@/lib/utils";
import JsonLd from "@/components/JsonLd";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://dojoclass.space"),
  title: {
    default: "DojoClass — Smart Attendance Tracker for College Students",
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
    title: "DojoClass — Smart Attendance Tracker for College Students",
    description:
      "Track your college attendance by subject, plan weekly schedules, and never fall below 75%. Free for all students.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DojoClass — Smart Attendance Tracker for College Students",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DojoClass — Smart Attendance Tracker for College Students",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <meta name="google-site-verification" content="MH-qCpIalYR4S1flnD1CRaPx_tUMSziNE9Y6cLpgdnI" />
      </head>
      <body className={inter.className}>
        <JsonLd />
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

