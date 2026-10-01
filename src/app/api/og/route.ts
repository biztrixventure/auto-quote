import { NextRequest, NextResponse } from "next/server";
import { renderOg, verifyOgRequest } from "@/lib/og";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/security";

export const runtime = "nodejs";

// Recently rendered cards, ready to send again without re-rendering.
const MAX_CACHED = 200;
const cards = new Map<string, ArrayBuffer>();
const HEADERS = {
  "Content-Type": "image/png",
  "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
};

// Renders a page's share image from its signed variables. Links are made by ogUrl()
// in page metadata; anything unsigned or edited is refused, so the server can't be
// used to render arbitrary images.
export async function GET(req: NextRequest) {
  const vars = verifyOgRequest(req.nextUrl.searchParams);
  if (!vars) return new NextResponse("Invalid or unsigned image link", { status: 403 });
  if (!rateLimit(`og:${clientIp(req.headers)}`, 120, 60 * 1000).ok) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const key = req.nextUrl.searchParams.get("sig")!;
  let png = cards.get(key);
  const hit = !!png;
  if (png) {
    cards.delete(key); // move to the newest position
  } else {
    png = await (await renderOg(vars)).arrayBuffer();
    if (cards.size >= MAX_CACHED) cards.delete(cards.keys().next().value!);
  }
  cards.set(key, png);
  // Same variables always give the same picture, so browsers and CDNs can keep it too.
  return new NextResponse(png, { headers: { ...HEADERS, "X-Cache": hit ? "HIT" : "MISS" } });
}
