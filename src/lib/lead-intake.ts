import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { visitorOptedOut } from "./legal";
import { rateLimit } from "./rate-limit";
import { clientIp } from "./security";

// Checks shared by the public lead forms (car insurance: /api/leads, service contract: /api/vsc-leads).

const MAX_BODY_BYTES = 32 * 1024;

/**
 * Same-site origin, JSON only, rate limits and size limit, then parses the body.
 * Returns the parsed body and client IP, or the error response to send back.
 */
export async function readLeadRequest(req: NextRequest): Promise<{ body: unknown; ip: string } | NextResponse> {
  // Only accept submissions sent by this website's own pages.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {}
    if (!host || originHost !== host) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
  }

  const ip = clientIp(req.headers);
  const burst = rateLimit(`lead:10m:${ip}`, 5, 10 * 60 * 1000);
  const daily = rateLimit(`lead:day:${ip}`, 20, 24 * 60 * 60 * 1000);
  if (!burst.ok || !daily.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a few minutes or call us." },
      { status: 429, headers: { "Retry-After": String(burst.ok ? daily.retryAfter : burst.retryAfter) } },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  try {
    return { body: JSON.parse(raw), ip };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

/** Same person, same product and same car within 24 hours: returns the earlier lead's id. */
export async function recentDuplicate(line: string, phone: string, email: string, vehicle: { year: number; make: string; model: string }) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Only the same car counts as a repeat; a second car is a new request with its own quotes.
  const existing = await db.lead.findFirst({
    where: {
      line,
      createdAt: { gte: since },
      OR: [{ phone }, { email }],
      vehicles: { some: { year: vehicle.year, make: { equals: vehicle.make, mode: "insensitive" }, model: { equals: vehicle.model, mode: "insensitive" } } },
    },
    select: { id: true },
  });
  return existing?.id ?? null;
}

/**
 * People on the do-not-contact or do-not-sell lists can still submit, but the lead is flagged.
 * A Global Privacy Control signal or our opt-out cookie also counts as a do-not-sell request.
 */
export async function contactFlags(email: string, phone: string, honorGpc: boolean) {
  const lists = await db.suppression.findMany({ where: { OR: [{ email }, { phone }] }, select: { type: true } });
  return {
    doNotContact: lists.some((s) => s.type === "dnc"),
    doNotSell: lists.some((s) => s.type === "do_not_sell") || (await visitorOptedOut(honorGpc)),
  };
}
