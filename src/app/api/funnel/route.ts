import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/security";

export const runtime = "nodejs";

// Anonymous quote-form progress for the drop-off report: a random per-tab ID and a step number.
// No personal data is accepted or stored.
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return new NextResponse(null, { status: 403 });
    } catch {
      return new NextResponse(null, { status: 403 });
    }
  }
  if (!rateLimit(`funnel:${clientIp(req.headers)}`, 60, 60 * 1000).ok) return new NextResponse(null, { status: 429 });

  const raw = await req.text();
  if (raw.length > 200) return new NextResponse(null, { status: 413 });
  let body: { sid?: unknown; step?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const sid = typeof body.sid === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.sid) ? body.sid : null;
  const step = typeof body.step === "number" && Number.isInteger(body.step) && body.step >= 0 && body.step <= 6 ? body.step : null;
  if (!sid || step === null) return new NextResponse(null, { status: 400 });

  try {
    await db.funnelEvent.create({ data: { sessionId: sid, step } });
  } catch {
    // Already recorded for this session and step.
  }
  return new NextResponse(null, { status: 204 });
}
