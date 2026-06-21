import type { MetadataRoute } from "next";

const BASE = "https://hyperyzer.com";

// Public, indexable pages only. App/auth/utility routes are excluded here and
// disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
    { path: "/refund", priority: 0.3, changeFrequency: "monthly" },
  ];

  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
