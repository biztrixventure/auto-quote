import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { visitorOptedOut } from "@/lib/legal";
import { getSettings, getSite } from "@/lib/settings";
import { digitsOnly, leadSubmissionSchema } from "@/lib/validation";
import { routeLead } from "@/lib/integrations/router";
import { notifyLead } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/security";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;

export async function POST(req: NextRequest) {
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
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const { form, tracking, trustedFormCertUrl, pageUrl, consentVersion, website } = parsed.data;
  // Hidden "website" field: people never see it, bots fill it in.
  if (website) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  // Consent text is always taken from the server config, never from the browser,
  // so the stored proof matches what the site actually displayed.
  const site = await getSite();
  if (consentVersion !== site.consentVersion) {
    return NextResponse.json({ error: "Consent version mismatch. Please reload the page." }, { status: 409 });
  }

  const ipAddress = ip;
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const phone = digitsOnly(form.phone).replace(/^1(?=\d{10}$)/, "");
  const email = form.email.toLowerCase();

  // Simple duplicate protection: same phone or email in the last 24 hours.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await db.lead.findFirst({
    where: { createdAt: { gte: since }, OR: [{ phone }, { email }] },
    select: { id: true },
  });
  if (existing) {
    await audit("api", "duplicate_submission", "lead", existing.id);
    return NextResponse.json({ id: existing.id, duplicate: true });
  }

  // People on the do-not-contact or do-not-sell lists can still submit, but the lead is flagged.
  // A Global Privacy Control signal or our opt-out cookie also counts as a do-not-sell request.
  const [lists, { legal }] = await Promise.all([
    db.suppression.findMany({ where: { OR: [{ email }, { phone }] }, select: { type: true } }),
    getSettings(),
  ]);
  const suppressed = lists.some((s) => s.type === "dnc");
  const doNotSell = lists.some((s) => s.type === "do_not_sell") || (await visitorOptedOut(legal.honorGpc));

  const lead = await db.lead.create({
    data: {
      firstName: form.firstName,
      lastName: form.lastName,
      email,
      phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      currentlyInsured: form.currentlyInsured === "yes",
      currentCarrier: form.currentCarrier || null,
      coverageLevel: form.coverageLevel,
      ...tracking,
      ipAddress,
      userAgent,
      doNotContact: suppressed,
      doNotSell,
      trustedFormCertUrl: trustedFormCertUrl || null,
      drivers: {
        create: {
          isPrimary: true,
          firstName: form.firstName,
          lastName: form.lastName,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          maritalStatus: form.maritalStatus,
          licenseStatus: form.licenseStatus,
          accidents: Number(form.accidents),
          violations: Number(form.violations),
        },
      },
      vehicles: {
        create: {
          year: Number(form.vehicleYear),
          make: form.vehicleMake,
          model: form.vehicleModel,
          ownership: form.ownership,
          primaryUse: form.primaryUse,
          annualMiles: Number(form.annualMiles),
        },
      },
      consent: {
        create: {
          consentText: site.consentText,
          consentVersion: site.consentVersion,
          ipAddress,
          userAgent,
          pageUrl,
        },
      },
    },
  });

  await audit("api", "lead_created", "lead", lead.id, { state: lead.state, source: lead.utmSource });

  // Runs inline so the user lands on real results. For heavy traffic,
  // move this into a job queue (BullMQ, SQS) and poll from the results page.
  try {
    await routeLead(lead.id);
  } catch (err) {
    await audit("system", "routing_failed", "lead", lead.id, { error: String(err) });
  }

  // Alerts go out after the visitor has their results, so they never slow the form down.
  after(() => notifyLead(lead.id));
  return NextResponse.json({ id: lead.id });
}
