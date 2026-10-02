import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { OPT_OUT_COOKIE, REQUEST_TYPES, type RequestType } from "@/lib/legal";
import { emailRequester, notifyPrivacyRequest } from "@/lib/notify";
import { findPerson, normalizeIdentity } from "@/lib/privacy";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/security";
import { getSettings, getSite } from "@/lib/settings";

export const runtime = "nodejs";

const schema = z.object({
  type: z.enum(Object.keys(REQUEST_TYPES) as [RequestType, ...RequestType[]]),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional().default(""),
  state: z.string().trim().max(2).optional().default(""),
  details: z.string().trim().max(1000).optional().default(""),
  viaAgent: z.boolean().optional().default(false),
  confirm: z.literal(true),
  website: z.string().max(0).optional(), // honeypot: real people never fill it
});

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Public privacy request form (/do-not-sell). Opt-outs take effect at once, no verification
// needed; access, delete and correct requests are queued for staff in /admin/privacy.
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (!origin || new URL(origin).host !== host) return json({ error: "Forbidden" }, 403);
  } catch {
    return json({ error: "Forbidden" }, 403);
  }
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "Send JSON." }, 415);
  const ip = clientIp(req.headers);
  if (!rateLimit(`privacy:h:${ip}`, 6, 3600_000).ok || !rateLimit(`privacy:d:${ip}`, 20, 86400_000).ok) {
    return json({ error: "Too many requests. Please try again later, or call us." }, 429);
  }
  const raw = await req.text();
  if (raw.length > 8 * 1024) return json({ error: "Request too large." }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "website") return json({ ok: true, reference: "RECEIVED", message: "Thank you. Your request has been received." });
    return json({ error: field === "confirm" ? "Please confirm the information is yours (or you are authorized)." : "Please check your name and email address." }, 400);
  }
  const f = parsed.data;
  const { email, phone } = normalizeIdentity(f.email, f.phone);
  if (!email) return json({ error: "Please enter a valid email address." }, 400);

  const [{ legal }, biz] = await Promise.all([getSettings(), getSite()]);
  const type = f.type;
  const info = REQUEST_TYPES[type];
  const leads = await findPerson(email, phone);
  const match = { OR: [{ email }, ...(phone ? [{ phone }] : [])] };

  // Opt-outs: applied right away to existing leads and to anything they submit later.
  if (type === "opt_out_sale" || type === "opt_out_contact") {
    const listType = type === "opt_out_sale" ? "do_not_sell" : "dnc";
    const exists = await db.suppression.findFirst({ where: { type: listType, ...match }, select: { id: true } });
    if (!exists) await db.suppression.create({ data: { email, phone: phone || null, type: listType, reason: "Privacy request form" } });
    await db.lead.updateMany({ where: match, data: type === "opt_out_sale" ? { doNotSell: true } : { doNotContact: true } });
  }

  const now = new Date();
  const request = await db.privacyRequest.create({
    data: {
      type,
      status: info.instant ? "completed" : "new",
      completedAt: info.instant ? now : null,
      firstName: f.firstName,
      lastName: f.lastName,
      email,
      phone,
      state: f.state.toUpperCase(),
      details: f.details,
      viaAgent: f.viaAgent,
      dueAt: new Date(now.getTime() + legal.responseDays * 86400_000),
      leadsFound: leads.length,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    select: { id: true, dueAt: true },
  });
  const reference = request.id.slice(-8).toUpperCase();
  // The log records that a request was made, without the person's details.
  await audit("public", "privacy_request", "privacy_request", request.id, { type, instant: info.instant });

  const message = info.instant
    ? type === "opt_out_sale"
      ? "Done. We will not sell or share your personal information, and advertising tracking is now off in this browser."
      : "Done. We've added you to our do-not-contact list. It can take up to 10 business days for every partner to stop."
    : `We've received your request. We'll confirm your identity and respond by ${request.dueAt.toLocaleDateString("en-US", { dateStyle: "long" })}.`;

  after(async () => {
    await notifyPrivacyRequest(request.id, info.short);
    if (legal.confirmByEmail) {
      await emailRequester(email, `Your privacy request to ${biz.name} (ref ${reference})`, [
        `Hi ${f.firstName},`,
        `We received your request: "${info.label}".`,
        message,
        `Your reference number is ${reference}. If you didn't make this request, reply to this email or call ${biz.phone}.`,
        `${biz.agencyLegalName || biz.name}`,
      ]);
    }
  });

  const res = json({ ok: true, reference, message, instant: info.instant });
  if (type === "opt_out_sale") {
    res.cookies.set(OPT_OUT_COOKIE, "1", { maxAge: 365 * 86400, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", httpOnly: false });
  }
  return res;
}
