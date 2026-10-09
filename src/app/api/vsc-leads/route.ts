import { after, NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { contactFlags, readLeadRequest, recentDuplicate } from "@/lib/lead-intake";
import { notifyLead } from "@/lib/notify";
import { getSettings, getSite } from "@/lib/settings";
import { digitsOnly, vscSubmissionSchema } from "@/lib/validation";

export const runtime = "nodejs";

// Vehicle service contract quote requests, saved as Lead.line = "vsc". The visitor then sees a
// thank-you page (/quote/results/[id]) and the team calls with plan options and prices.
export async function POST(req: NextRequest) {
  const request = await readLeadRequest(req);
  if (request instanceof NextResponse) return request;
  const { body, ip } = request;

  const parsed = vscSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }
  const { form, tracking, trustedFormCertUrl, pageUrl, consentVersion, website } = parsed.data;
  // Hidden "website" field: people never see it, bots fill it in.
  if (website) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  // Consent text comes from the server config, never from the browser.
  const site = await getSite();
  if (consentVersion !== site.vscConsentVersion) {
    return NextResponse.json({ error: "Consent version mismatch. Please reload the page." }, { status: 409 });
  }

  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const phone = digitsOnly(form.phone).replace(/^1(?=\d{10}$)/, "");
  const email = form.email.toLowerCase();

  const existing = await recentDuplicate("vsc", phone, email, { year: Number(form.vehicleYear), make: form.vehicleMake, model: form.vehicleModel });
  if (existing) {
    await audit("api", "duplicate_submission", "lead", existing);
    return NextResponse.json({ id: existing, duplicate: true });
  }

  const { legal } = await getSettings();
  const { doNotContact, doNotSell } = await contactFlags(email, phone, legal.honorGpc);

  const lead = await db.lead.create({
    data: {
      line: "vsc",
      firstName: form.firstName,
      lastName: form.lastName,
      email,
      phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      coverageLevel: form.planInterest, // the plan level the person is most interested in
      ...tracking,
      ipAddress: ip,
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
          mileage: Number(form.mileage),
          factoryWarranty: form.factoryWarranty,
        },
      },
      consent: {
        create: { consentText: site.vscConsentText, consentVersion: site.vscConsentVersion, ipAddress: ip, userAgent, pageUrl },
      },
    },
  });

  await audit("api", "lead_created", "lead", lead.id, { line: "vsc", state: lead.state, source: lead.utmSource });
  after(() => notifyLead(lead.id));
  return NextResponse.json({ id: lead.id });
}
