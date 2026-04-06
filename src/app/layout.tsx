import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SwipeBack from "@/components/SwipeBack";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Artie",
  description: "Team Topaz mileage tracker",
  icons: {
    icon: "/apple-touch-icon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased min-h-screen bg-navy text-cream`}>
        <SwipeBack>{children}</SwipeBack>
      </body>
    </html>
  );
}
