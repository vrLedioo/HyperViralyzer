import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/300.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "VidAnalyzer — AI Video & Idea Analysis",
  description: "Score your video ideas and analyze real videos with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased selection:bg-pink-500/30 selection:text-pink-900">
      <body className="font-sans text-pink-950 bg-[#FDF2F8] min-h-screen relative overflow-x-hidden">
        {/* Apple-style Liquid/Ambient Background */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-pink-400/30 to-orange-400/20 blur-[120px] mix-blend-multiply animate-blob"></div>
          <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-rose-300/30 to-pink-500/20 blur-[100px] mix-blend-multiply animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-tr from-orange-300/20 to-pink-400/30 blur-[140px] mix-blend-multiply animate-blob animation-delay-4000"></div>
          
          {/* Noise overlay for premium Apple-like texture */}
          <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        </div>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
