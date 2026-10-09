import { livePosts } from "@/lib/blog";
import { db } from "@/lib/db";
import { fillCompany, getSettings, getSite } from "@/lib/settings";

/** Cuts at a word boundary instead of mid-word. */
const shorten = (t: string, max: number) => (t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, "") + "…");

export const dynamic = "force-dynamic";

const line = (s: string) => s.replace(/\s+/g, " ").trim();

// /llms.txt: a plain summary of the site for AI assistants (ChatGPT, Claude, Perplexity…),
// following the llmstxt.org format. Built from live content, so it's always up to date.
export async function GET() {
  const [{ ai, content }, biz] = await Promise.all([getSettings(), getSite()]);
  if (!ai.llmsTxt) return new Response("Not found", { status: 404 });
  const u = (path: string) => `${biz.url}${path}`;

  const [posts, pages] = await Promise.all([
    db.post.findMany({ where: livePosts(), orderBy: { publishedAt: "desc" }, take: 50, select: { title: true, slug: true, excerpt: true } }),
    db.page.findMany({ where: { status: "published", noindex: false }, orderBy: { title: "asc" }, select: { title: true, slug: true, intro: true } }),
  ]);

  const out: string[] = [
    `# ${biz.name}`,
    "",
    `> ${line(biz.description)}`,
    "",
    line(
      `${biz.name} sells vehicle service contracts, often called extended car warranties, to US drivers. ` +
        `Plans range from powertrain to complete protection, are backed and administered by established providers, and come with a ` +
        `30-day money-back guarantee. A vehicle service contract is not insurance. Phone: ${biz.phone}.`,
    ),
    "",
    "## Main pages",
    `- [Get an extended car warranty quote](${u("/quote/vehicle-protection")}): a short form that shows estimated plan prices for your car.`,
    `- [Extended car warranty plans, prices and coverage](${u("/extended-car-warranty")}): what a vehicle service contract is, the three plan levels, what they cost and what they exclude.`,
    `- [Car repair costs](${u("/repair-costs")}): typical out-of-pocket costs of common car repairs.`,
    `- [About ${biz.name}](${u("/about")}): who we are, what we offer, how we research our guides and how we are paid.`,
    `- [Why choose ${biz.name}](${u("/why-us")}): ${shorten(line(fillCompany(content.whyIntro)), 200)}`,
    `- [Extended car warranty FAQ](${u("/faq")}): what a vehicle service contract includes, what it costs and how it works.`,
  ];
  out.push(`- [Blog](${u("/blog")}): guides on extended car warranties, vehicle service contracts and repair costs.`);

  if (posts.length) {
    out.push("", "## Blog posts");
    for (const p of posts) out.push(`- [${line(p.title)}](${u(`/blog/${p.slug}`)})${p.excerpt ? `: ${line(p.excerpt)}` : ""}`);
  }
  if (pages.length) {
    out.push("", "## More pages");
    for (const p of pages) out.push(`- [${line(p.title)}](${u(`/${p.slug}`)})${p.intro ? `: ${line(p.intro)}` : ""}`);
  }
  out.push(
    "",
    "## Optional",
    `- [Privacy Policy](${u("/privacy")})`,
    `- [Terms of Use](${u("/terms")})`,
    `- [Do Not Sell or Share My Personal Information](${u("/do-not-sell")})`,
    "",
  );

  return new Response(out.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
