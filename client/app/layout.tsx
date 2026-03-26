import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vaidya-Agent | Healthcare Triage System",
  description: "Autonomous Healthcare Triage System for Northern India - Bridging the accessibility gap with AI-powered ABDM and UHI integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
