import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Rajdhani } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import { Share_Tech_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { NavBar } from "@/components/NavBar";
import { AppLoader } from "@/components/AppLoader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const shareTechMono = Share_Tech_Mono({
  variable: "--font-share-tech-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Cloud9 Gameplan — VALORANT Pro Simulation",
  description:
    "Simulate full VALORANT rounds with pro movement patterns, combat models, and positioning data from 590K+ VCT samples. Built for Cloud9 coaching staff.",
  icons: {
    icon: "/cloud9-logo.svg",
    apple: "/cloud9-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable} ${jetbrainsMono.variable} ${shareTechMono.variable} antialiased min-h-screen`}
      >
        <Providers>
          <AppLoader />
          <NavBar />

          {children}
        </Providers>
      </body>
    </html>
  );
}
