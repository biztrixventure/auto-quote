import { livePosts } from "@/lib/blog";
import { db } from "@/lib/db";
import { fillCompany, getSettings, getSite } from "@/lib/settings";
import { guidePath, quickAnswer } from "@/lib/state-guides";

export const dynamic = "force-dynamic";

const line = (s: string) => s.replace(/\s+/g, " ").trim();

// /llms.txt: a plain summary of the site for AI assistants (ChatGPT, Claude, Perplexity…),
// following the llmstxt.org format. Built from live content, so it's always up to date.
export async function GET() {
  const [{ ai, content }, biz] = await Promise.all([getSettings(), getSite()]);
  if (!ai.llmsTxt) return new Response("Not found", { status: 404 });
  const u = (path: string) => `${biz.url}${path}`;

  const [guides, posts, pages] = await Promise.all([
    db.stateGuide.findMany({ where: { published: true }, orderBy: { name: "asc" } }),
    db.post.findMany({ where: livePosts(), orderBy: { publishedAt: "desc" }, take: 50, select: { title: true, slug: true, excerpt: true } }),
    db.page.findMany({ where: { status: "published", noindex: false }, orderBy: { title: "asc" }, select: { title: true, slug: true, intro: true } }),
  ]);

  const out: string[] = [
    `# ${biz.name}`,
    "",
    `> ${line(biz.description)}`,
    "",
    line(
      `${biz.name} offers two separate products to US drivers. Car insurance: compare quotes from several insurance companies with one form (${biz.licenseNote}). ` +
        `Vehicle service contracts (often called extended car warranties): optional contracts that pay for repairs to listed parts; they are not insurance. Phone: ${biz.phone}.`,
    ),
    "",
    "## Main pages",
    `- [Get a free car insurance quote](${u("/quote/auto")}): one short form to compare prices from several insurance companies.`,
    `- [Get a vehicle service contract quote](${u("/quote/vehicle-protection")}): plan options and prices for help with repair bills.`,
    `- [Car repair costs](${u("/repair-costs")}): typical out-of-pocket costs of common car repairs.`,
    `- [Why choose ${biz.name}](${u("/why-us")}): ${line(fillCompany(content.whyIntro)).slice(0, 200)}`,
    `- [Vehicle service contract FAQ](${u("/faq")}): what a service contract includes and how it differs from car insurance.`,
  ];
  if (guides.length) out.push(`- [Car insurance requirements by state](${u("/car-insurance")}): minimum coverage and no-fault rules for each state.`);
  out.push(`- [Blog](${u("/blog")}): guides on car insurance, vehicle service contracts and repair costs.`);

  if (guides.length) {
    out.push("", "## Car insurance requirements by state");
    for (const g of guides) out.push(`- [${g.name}](${u(guidePath(g))}): ${line(quickAnswer(g))}`);
  }
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
