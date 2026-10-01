import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic"; // uses SITE_URL from the running server, not the build

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/quote/results/"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
