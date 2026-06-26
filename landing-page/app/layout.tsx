import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReducedMotionProvider } from "@/components/providers/ReducedMotionProvider";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { SITE, SITE_URL } from "@/lib/constants/site";
import "./globals.css";

/** Body + display face. Exposed as a CSS var so `--font-sans` resolves it. */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

/** Mono face for ALL timecodes, REC HUD, model badges, scrubber labels. */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE.title,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "UGC ad generator",
    "AI hook video",
    "TikTok ad maker",
    "Reels ad generator",
    "product video ads",
    "viral hook video",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: SITE.title,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

/** Studio Black canvas — keeps the browser UI / overscroll dark. */
export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-[100dvh] bg-bg text-fg">
        <ReducedMotionProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </ReducedMotionProvider>
      </body>
    </html>
  );
}
