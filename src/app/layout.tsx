import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { LiveRefresh } from "@/components/LiveRefresh";

const archivo = Archivo({ subsets: ["latin"], weight: ["400", "600", "800", "900"] });

export const metadata: Metadata = {
  title: "Korfball SA – Fixtures, Tables and Stats",
  description: "Official stats and live scores for Korfball South Australia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${archivo.className} min-h-screen`}>
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