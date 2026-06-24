import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/300.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { StorageNotice } from "@/components/StorageNotice";
import { PaddleScript } from "@/components/PaddleScript";

const SITE_URL = "https://hyperyzer.com";
const TITLE = "Hyperyzer — AI Video Scoring, Hashtags & Best Time to Post";
const DESCRIPTION =
  "Score your video's hook, retention & viral potential, get the best hashtags, and the best time to post — all in seconds with AI.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Hyperyzer",
  keywords: [
    "Hyperyzer",
    "AI video scoring",
    "viral score",
    "video hook analysis",
    "best time to post",
    "hashtag generator",
    "TikTok",
    "YouTube Shorts",
    "Instagram Reels",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Hyperyzer",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Structured data so Google understands "Hyperyzer" as a brand/site entity —
// important for a branded search to surface the official site.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Hyperyzer",
      url: SITE_URL,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Hyperyzer",
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased selection:bg-pink-500/30 selection:text-pink-900">
      <body className="font-sans text-pink-950 bg-[#FDF2F8] min-h-screen relative overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Apple-style Liquid/Ambient Background */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-pink-400/30 to-orange-400/20 blur-[120px] mix-blend-multiply animate-blob"></div>
          <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-rose-300/30 to-pink-500/20 blur-[100px] mix-blend-multiply animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-tr from-orange-300/20 to-pink-400/30 blur-[140px] mix-blend-multiply animate-blob animation-delay-4000"></div>
          
          {/* Noise overlay for premium Apple-like texture */}
          <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        </div>
        <AuthProvider>{children}</AuthProvider>
        <StorageNotice />
        <PaddleScript />
      </body>
    </html>
  );
}
