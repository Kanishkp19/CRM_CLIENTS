import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cycle — Universal Membership & Lifecycle CRM",
  description:
    "One lightweight, AI-assisted CRM for small local service businesses that sell anything with a start and an end — memberships, packages, rentals, contracts, stays.",
  keywords: [
    "Cycle CRM", "membership CRM", "gym CRM", "salon CRM",
    "tuition CRM", "AMC CRM", "rental CRM", "WhatsApp reminders",
    "AI data entry", "voice-to-CRM",
  ],
  authors: [{ name: "Cycle" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  openGraph: {
    title: "Cycle — Universal Membership & Lifecycle CRM",
    description: "Never miss a renewal again. One engine, many businesses.",
    siteName: "Cycle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cycle — Universal Membership & Lifecycle CRM",
    description: "Never miss a renewal again. One engine, many businesses.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
