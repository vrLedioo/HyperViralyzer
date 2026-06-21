import type { MetadataRoute } from "next";

// Crawlers welcome on public pages; private app/auth/utility routes are kept
// out of the index. Points to the sitemap so Google discovers every page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app",
        "/account",
        "/verify-email",
        "/reset-password",
        "/forgot-password",
      ],
    },
    sitemap: "https://hyperyzer.com/sitemap.xml",
  };
}
