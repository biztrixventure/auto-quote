import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic"; // uses SITE_URL and settings from the running server, not the build

const PRIVATE = ["/admin", "/api/", "/quote/results/", "/blog/preview/", "/preview/"];

// AI assistants that fetch pages to answer questions and cite sources (AI search).
const AI_SEARCH_BOTS = ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot", "Claude-User", "DuckAssistBot", "MistralAI-User"];
// Crawlers that collect pages to train AI models. Blocking them doesn't affect Google or Bing search.
const AI_TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "meta-externalagent", "Bytespider", "Amazonbot", "cohere-ai"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { ai } = await getSettings();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_SEARCH_BOTS, ...(ai.allowSearchBots ? { allow: "/", disallow: PRIVATE } : { disallow: "/" }) },
      { userAgent: AI_TRAINING_BOTS, ...(ai.allowTrainingBots ? { allow: "/", disallow: PRIVATE } : { disallow: "/" }) },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
