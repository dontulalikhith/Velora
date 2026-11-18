import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant" });
const body = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = { title: "Velora", description: "Order smart. Wait less." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-sans bg-ink text-bone antialiased`}>{children}</body>
    </html>
  );
}
