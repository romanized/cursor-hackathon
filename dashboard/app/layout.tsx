import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "hookm — viral UGC, on tap",
  description: "Turn a product URL into a TikTok-ready hook video.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${instrument.variable} h-full`}
    >
      <body className="min-h-full bg-bg text-text">
        <div className="grain" aria-hidden />
        {children}
      </body>
    </html>
  );
}
