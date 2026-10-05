import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { apiError, json } from "@/lib/blog-api";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { ensureStateGuides, guidePath } from "@/lib/state-guides";

export const dynamic = "force-dynamic";

/** All state guides with their status (admin keys only). */
export async function GET(req: Request) {
  const caller = await authenticateApiKey(req);
  if (caller instanceof NextResponse) return caller;
  if (!caller.editor) return apiError(403, "Only an admin key can read state guides");
  await ensureStateGuides();
  const states = await db.stateGuide.findMany({
    orderBy: { name: "asc" },
    select: { code: true, slug: true, name: true, published: true, verifiedAt: true, updatedAt: true, intro: true, contentHtml: true, avgAnnualPremium: true },
  });
  return json({
    states: states.map((s) => ({
      code: s.code, name: s.name, slug: s.slug, published: s.published, verifiedAt: s.verifiedAt, updatedAt: s.updatedAt,
      url: `${site.url}${guidePath(s)}`, hasIntro: !!s.intro, extraContentChars: s.contentHtml.length, hasAveragePremium: s.avgAnnualPremium != null,
    })),
  });
}
