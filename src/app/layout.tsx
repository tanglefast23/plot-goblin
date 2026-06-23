import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PlotGoblinMascot } from "@/components/PlotGoblinMascot";
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
  title: "Plot Goblin",
  description: "A funny screenplay structure helper for taming premises, characters, themes, beats, and scenes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <PlotGoblinMascot />
        {children}
      </body>
    </html>
  );
}
