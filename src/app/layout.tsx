import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { LiveRefresh } from "@/components/LiveRefresh";

const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Korfball SA",
  description: "Official stats and live scores for Korfball South Australia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <Header />
        <LiveRefresh />
        {children}
        <footer className="mt-12 bg-hd px-4 py-8 text-sm text-white/70">
          <div className="mx-auto max-w-6xl">Korfball South Australia – Official league statistics.</div>
        </footer>
      </body>
    </html>
  );
}