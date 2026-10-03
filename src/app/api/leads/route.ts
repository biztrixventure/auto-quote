import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { contactFlags, readLeadRequest, recentDuplicate } from "@/lib/lead-intake";
import { getSettings, getSite } from "@/lib/settings";
import { digitsOnly, leadSubmissionSchema } from "@/lib/validation";
import { routeLead } from "@/lib/integrations/router";
import { notifyLead } from "@/lib/notify";

export const runtime = "nodejs";

// Car insurance quote requests. Service contract requests go to /api/vsc-leads.
export async function POST(req: NextRequest) {
  const request = await readLeadRequest(req);
  if (request instanceof NextResponse) return request;
  const { body, ip } = request;

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
  const existing = await recentDuplicate("auto", phone, email);
  if (existing) {
    await audit("api", "duplicate_submission", "lead", existing);
    return NextResponse.json({ id: existing, duplicate: true });
  }

  const { legal } = await getSettings();
  const { doNotContact, doNotSell } = await contactFlags(email, phone, legal.honorGpc);

  const lead = await db.lead.create({
    data: {
      line: "auto",
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
      doNotContact,
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
