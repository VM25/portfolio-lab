import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Major headings / display
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

// Complementary intermediate tier: subheadings, section labels, supporting
// hierarchy. Engineered/technical, pairs cleanly with Archivo + Geist.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-subhead",
});

// Body / normal text
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

// Data, tickers, numeric tables, validation rows, technical metadata
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Portfolio Risk & Allocation Analytics | Vatsal Maniar",
  description:
    "A multi-asset study of how allocation rules behave across rolling estimates, regime signals, factor exposure, drawdowns, transaction costs, and crisis windows.",
  openGraph: {
    title: "Portfolio Risk & Allocation Analytics",
    description:
      "Equal Weight, Global Minimum Variance, Max Sharpe, and Regime-Aware allocation compared across benchmarks, lookback windows, transaction costs, and crisis regimes.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexSans.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
