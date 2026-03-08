import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SwipeBack from "@/components/SwipeBack";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Artie",
  description: "Team Topaz mileage tracker",
  icons: {
    apple: "/apple-touch-icon.png",
  },
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
