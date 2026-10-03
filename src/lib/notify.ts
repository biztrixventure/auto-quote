import { productLabel } from "./products";
import { audit } from "./audit";
import { db } from "./db";
import { postJson } from "./outbound";
import { getSettings } from "./settings";
import { site } from "./site";

/**
 * New-lead alerts. Channels turn on when configured:
 *  - Email: RESEND_API_KEY + NOTIFY_FROM in .env, recipients in /admin/settings
 *  - SMS:   TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM in .env, numbers in /admin/settings
 *  - Chat:  a Slack, Microsoft Teams or Google Chat webhook link in /admin/settings
 * A failing channel never blocks the others; failures are written to the activity log.
 */

export const channelStatus = () => ({
  email: !!(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM),
  sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM),
});

const list = (csv: string) => csv.split(",").map((s) => s.trim()).filter(Boolean);
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Message = { subject: string; lines: string[]; link: string };

async function sendEmail(to: string[], m: Message) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM,
      to,
      subject: m.subject,
      text: `${m.lines.join("\n")}\n\nOpen in admin: ${m.link}`,
      html: `<p>${m.lines.map(escapeHtml).join("<br>")}</p><p><a href="${escapeHtml(m.link)}">Open in admin</a></p>`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}

async function sendSms(to: string[], m: Message) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const body = `${m.subject}\n${m.lines.slice(0, 3).join("\n")}\n${m.link}`.slice(0, 600);
  for (const number of to) {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: process.env.TWILIO_FROM!, To: number, Body: body }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Twilio ${res.status}`);
  }
}

async function sendWebhook(url: string, m: Message) {
  // {text} is understood by Slack, Microsoft Teams and Google Chat incoming webhooks.
  const res = await postJson(url, { text: `*${m.subject}*\n${m.lines.join("\n")}\n<${m.link}|Open in admin>` });
  if (!res.ok) throw new Error(`Webhook ${res.status}`);
}

/** Sends a message to every configured channel. Returns what happened per channel. */
async function broadcast(m: Message, context: string) {
  const { notifications: n } = await getSettings();
  const ch = channelStatus();
  const jobs: [string, Promise<void>][] = [];
  if (ch.email && list(n.emailTo).length) jobs.push(["email", sendEmail(list(n.emailTo), m)]);
  if (ch.sms && list(n.smsTo).length) jobs.push(["sms", sendSms(list(n.smsTo), m)]);
  if (n.webhookUrl) jobs.push(["chat", sendWebhook(n.webhookUrl, m)]);
  const results = await Promise.allSettled(jobs.map(([, p]) => p));
  const report: Record<string, string> = {};
  for (const [i, r] of results.entries()) {
    const channel = jobs[i][0];
    report[channel] = r.status === "fulfilled" ? "sent" : String(r.reason).slice(0, 200);
    if (r.status === "rejected") await audit("system", "notification_failed", "notification", context, { channel, error: report[channel] });
  }
  return report;
}

const STATUS_TEXT: Record<string, string> = {
  quoted: "got online quotes",
  sold_lead: "was sold to a lead buyer",
  agent_followup: "got NO online quotes — call them",
  new: "is new",
};

/** Alert for a newly submitted lead. Safe to call after the response has been sent. */
export async function notifyLead(leadId: string) {
  try {
    const { notifications: n } = await getSettings();
    const lead = await db.lead.findUnique({ where: { id: leadId }, include: { vehicles: { take: 1 } } });
    if (!lead) return;
    const urgent = lead.status === "agent_followup";
    if (!n.onNewLead && !(urgent && n.onNoQuotes)) return;
    const v = lead.vehicles[0];
    const product = productLabel(lead.line);
    await broadcast(
      {
        subject: `${urgent ? "⚠ Call now: " : ""}New ${product.toLowerCase()} lead — ${lead.firstName} ${lead.lastName} (${lead.state})`,
        lines: [
          `${lead.firstName} ${lead.lastName} ${STATUS_TEXT[lead.status] ?? `is ${lead.status}`}.`,
          `Product: ${product}`,
          `Phone: ${lead.phone}${lead.doNotContact ? " (DO NOT CONTACT)" : ""}`,
          `Location: ${[lead.city, lead.state].filter(Boolean).join(", ")} ${lead.zip}`,
          v ? `Vehicle: ${v.year} ${v.make} ${v.model}${v.mileage ? `, ${v.mileage.toLocaleString("en-US")} miles` : ""}` : "",
        ].filter(Boolean),
        link: `${site.url}/admin/leads/${lead.id}`,
      },
      lead.id,
    );
  } catch (err) {
    await audit("system", "notification_failed", "lead", leadId, { error: String(err).slice(0, 200) });
  }
}

/** Tells staff about a new privacy request. Safe to call after the response has been sent. */
export async function notifyPrivacyRequest(requestId: string, typeLabel: string) {
  try {
    const r = await db.privacyRequest.findUnique({ where: { id: requestId } });
    if (!r) return;
    const due = r.status === "completed" ? "Already applied automatically." : `Respond by ${r.dueAt.toLocaleDateString("en-US", { dateStyle: "medium" })}.`;
    await broadcast(
      { subject: `Privacy request: ${typeLabel}`, lines: [`${r.firstName} ${r.lastName} (${r.state || "state not given"})`, due], link: `${site.url}/admin/privacy#requests` },
      `privacy:${requestId}`,
    );
  } catch (err) {
    await audit("system", "notification_failed", "privacy_request", requestId, { error: String(err).slice(0, 200) });
  }
}

/** Confirmation email to the person who made a privacy request (only when email is set up). */
export async function emailRequester(to: string, subject: string, lines: string[]) {
  if (!channelStatus().email) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM,
        to: [to],
        subject,
        text: lines.join("\n\n"),
        html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(""),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return true;
  } catch (err) {
    await audit("system", "notification_failed", "privacy_request", "*", { channel: "email", error: String(err).slice(0, 200) });
    return false;
  }
}

export async function sendTestAlert(by: string) {
  return broadcast({ subject: `Test alert from ${site.name}`, lines: [`${by} sent this test from the admin. New-lead alerts will look like this.`], link: `${site.url}/admin` }, "test");
}
