import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { defaultMetadata, structuredData } from "./metadata";
import ServiceWorkerProvider from "@/components/ServiceWorkerProvider";
import "./globals.css";

const geistSans = localFont({
  src: "../../node_modules/next/dist/esm/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-inter",
  display: "swap",
});

const geistMono = localFont({
  src: "../../node_modules/next/dist/esm/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = defaultMetadata;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0B0F19',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#0B0F19] text-slate-100`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
