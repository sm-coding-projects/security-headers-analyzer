import type { Metadata } from "next";
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
  title: "Security Headers Analyzer - Secure Your Website",
  description: "Analyze your website's security headers, get detailed recommendations, and automatically generate fixes. Support for CSP, HSTS, X-Frame-Options, and 15+ other critical security headers.",
  keywords: "security headers, CSP, HSTS, X-Frame-Options, web security, security analysis",
  authors: [{ name: "Security Headers Analyzer" }],
  viewport: "width=device-width, initial-scale=1",
  openGraph: {
    title: "Security Headers Analyzer - Secure Your Website",
    description: "Analyze your website's security headers and get instant recommendations with automated fixes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
