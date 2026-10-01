import { requireAdmin } from "@/lib/admin-guard";
import { ogUrl } from "@/lib/og";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import { Checkbox, FormField, Notice, SectionFooter, inputCls } from "@/components/admin/forms";
import { Card, PageHeader, btnPrimary } from "@/components/admin/ui";
import { saveBusiness, saveNotifications, saveResults, saveSeo, saveTracking, saveVerification, testAlerts } from "./actions";
import { channelStatus } from "@/lib/notify";

export const dynamic = "force-dynamic";

function Status({ on }: { on: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${on ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
      {on ? "Connected" : "Not set"}
    </span>
  );
}

// Pictures the share-image template may use (files in /public).
const OG_IMAGES = ["", "/images/cta-car.webp", "/images/car-diagram.webp", "/images/reviews-phone.webp", "/images/parts/transmission.webp", "/images/parts/cylinder-head.webp", "/images/parts/alternator.webp"];

// Share cards currently used by the site's pages.
const PAGE_CARDS = [
  { page: "Homepage", path: "/", src: "/opengraph-image" },
  { page: "Get a quote", path: "/quote/auto", src: ogUrl({ eyebrow: "Free quote", title: "Get your car insurance quote in minutes", subtitle: "Compare prices from several insurance companies with one quick form.", image: "/images/cta-car.webp" }) },
  { page: "Privacy Policy", path: "/privacy", src: ogUrl({ eyebrow: "Legal", title: "Privacy Policy", subtitle: "How we collect, use and protect your information, and the choices you have." }) },
  { page: "Terms of Use", path: "/terms", src: ogUrl({ eyebrow: "Legal", title: "Terms of Use", subtitle: "The terms that apply when you use our website to compare car insurance quotes." }) },
];

type Search = { saved?: string; error?: string; og_eyebrow?: string; og_title?: string; og_subtitle?: string; og_price?: string; og_priceNote?: string; og_image?: string };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin("admin");
  const [sp, s] = await Promise.all([searchParams, getSettings()]);
  const { saved, error } = sp;
  const og = {
    eyebrow: sp.og_eyebrow ?? "Repair costs",
    title: sp.og_title ?? "Could you afford a $3,000 repair bill?",
    subtitle: sp.og_subtitle ?? "Protect your budget from expensive surprises.",
    price: sp.og_price ?? "$3,000",
    priceNote: sp.og_priceNote ?? "average transmission repair",
    image: sp.og_image ?? "/images/parts/transmission.webp",
  };
  const previewSrc = ogUrl(og);
  const { tracking, verification, seo, results, business, notifications } = s;
  const channels = channelStatus();

  return (
    <>
      <PageHeader title="Settings" subtitle="Connect analytics and search tools, and control what visitors see." />
      <Notice saved={saved} error={error} />

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card title="Business details and consent">
          <form action={saveBusiness} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Phone shown on the website" htmlFor="b-phone"><input id="b-phone" name="phone" defaultValue={business.phone} required className={inputCls} /></FormField>
              <FormField label="Contact email" htmlFor="b-email"><input id="b-email" name="email" type="email" defaultValue={business.email} required className={inputCls} /></FormField>
            </div>
            <FormField label="Legal business name" htmlFor="b-legal" hint="Shown in the footer copyright line.">
              <input id="b-legal" name="agencyLegalName" defaultValue={business.agencyLegalName} maxLength={120} className={inputCls} />
            </FormField>
            <FormField label="License note" htmlFor="b-license" hint="Many states require your agency license / NPN on the website.">
              <textarea id="b-license" name="licenseNote" defaultValue={business.licenseNote} maxLength={400} rows={2} className={`${inputCls} h-auto py-2.5`} />
            </FormField>
            <FormField
              label="Consent text shown above “See my quotes”"
              htmlFor="b-consent"
              hint={<>Current version: <strong className="text-asphalt">{business.consentVersion}</strong>. Changing the wording creates a new version automatically, so every lead records exactly what it agreed to. Have your lawyer approve this text.</>}
            >
              <textarea id="b-consent" name="consentText" defaultValue={business.consentText} maxLength={2000} rows={6} required className={`${inputCls} h-auto py-2.5`} />
            </FormField>
            <SectionFooter><button className={btnPrimary}>Save business details</button></SectionFooter>
          </form>
        </Card>

        <Card title="New-lead alerts" action={<Status on={!!(notifications.webhookUrl || (channels.email && notifications.emailTo) || (channels.sms && notifications.smsTo))} />}>
          <form action={saveNotifications} className="space-y-4">
            <ul className="grid gap-2 text-xs sm:grid-cols-3">
              {[
                ["Email", channels.email, "RESEND_API_KEY + NOTIFY_FROM"],
                ["Text message", channels.sms, "TWILIO_ACCOUNT_SID, _AUTH_TOKEN, _FROM"],
                ["Slack / Teams", true, "paste a webhook link below"],
              ].map(([label, ready, need]) => (
                <li key={label as string} className={`rounded-lg border px-3 py-2 ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-[#E4E7EC] bg-[#F9FAFB] text-road"}`}>
                  <span className="block font-semibold">{label as string}: {ready ? "ready" : "not set up"}</span>
                  {!ready && <span>Needs {need as string} in .env</span>}
                </li>
              ))}
            </ul>
            <FormField label="Email alerts to" htmlFor="n-email" hint="Comma-separated, up to 10.">
              <input id="n-email" name="emailTo" defaultValue={notifications.emailTo} placeholder="sales@yourdomain.com, owner@yourdomain.com" className={inputCls} />
            </FormField>
            <FormField label="Text alerts to" htmlFor="n-sms" hint="International format, comma-separated, up to 5.">
              <input id="n-sms" name="smsTo" defaultValue={notifications.smsTo} placeholder="+15125550100" className={inputCls} />
            </FormField>
            <FormField label="Slack, Teams or Google Chat webhook" htmlFor="n-hook" hint="Create an “incoming webhook” in your chat app and paste the https link.">
              <input id="n-hook" name="webhookUrl" defaultValue={notifications.webhookUrl} placeholder="https://hooks.slack.com/services/…" className={inputCls} autoComplete="off" />
            </FormField>
            <div className="space-y-2">
              <Checkbox name="onNewLead" label="Alert for every new lead" defaultChecked={notifications.onNewLead} />
              <Checkbox name="onNoQuotes" label="Always alert when a lead got no quotes and needs a call" defaultChecked={notifications.onNoQuotes} hint="Sent even if the option above is off. Marked “Call now”." />
            </div>
            <SectionFooter>
              <button formAction={testAlerts} className="inline-flex items-center rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">Send test alert</button>
              <button className={btnPrimary}>Save alerts</button>
            </SectionFooter>
          </form>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Analytics and ad tracking" action={<Status on={!!(tracking.ga4Id || tracking.gtmId || tracking.metaPixelId)} />}>
          <form action={saveTracking} className="space-y-4">
            <FormField label="Google Analytics 4 measurement ID" htmlFor="ga4Id" hint="Google Analytics → Admin → Data streams → your website. Starts with G-.">
              <input id="ga4Id" name="ga4Id" defaultValue={tracking.ga4Id} placeholder="G-XXXXXXXXXX" className={inputCls} autoComplete="off" />
            </FormField>
            <FormField label="Google Tag Manager container ID" htmlFor="gtmId" hint="Optional. Use this instead of the GA4 ID if your marketer manages tags in Tag Manager.">
              <input id="gtmId" name="gtmId" defaultValue={tracking.gtmId} placeholder="GTM-XXXXXXX" className={inputCls} autoComplete="off" />
            </FormField>
            <FormField label="Meta (Facebook) Pixel ID" htmlFor="metaPixelId" hint="Meta Events Manager → Data sources → your pixel. Numbers only.">
              <input id="metaPixelId" name="metaPixelId" defaultValue={tracking.metaPixelId} placeholder="123456789012345" inputMode="numeric" className={inputCls} autoComplete="off" />
            </FormField>
            <p className="rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-xs leading-relaxed text-road">
              When a visitor submits the quote form, a <strong>Lead</strong> conversion is sent to each connected tool, so you can measure your ads.
            </p>
            <SectionFooter><button className={btnPrimary}>Save tracking</button></SectionFooter>
          </form>
        </Card>

        <Card title="Search engine verification" action={<Status on={!!(verification.google || verification.bing || verification.meta)} />}>
          <form action={saveVerification} className="space-y-4">
            <FormField label="Google Search Console" htmlFor="google" hint="Search Console → Add property → URL prefix → HTML tag. Paste the code or the whole tag.">
              <input id="google" name="google" defaultValue={verification.google} placeholder='<meta name="google-site-verification" content="…" />' className={inputCls} autoComplete="off" />
            </FormField>
            <FormField label="Bing Webmaster Tools" htmlFor="bing" hint="Bing Webmaster → Add site → HTML meta tag (msvalidate.01).">
              <input id="bing" name="bing" defaultValue={verification.bing} placeholder='<meta name="msvalidate.01" content="…" />' className={inputCls} autoComplete="off" />
            </FormField>
            <FormField label="Meta domain verification" htmlFor="meta" hint="Meta Business Settings → Brand safety → Domains → Meta-tag verification.">
              <input id="meta" name="meta" defaultValue={verification.meta} placeholder='<meta name="facebook-domain-verification" content="…" />' className={inputCls} autoComplete="off" />
            </FormField>
            <p className="rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-xs leading-relaxed text-road">
              After saving, go back to each tool and click <strong>Verify</strong>. Your sitemap for Search Console is{" "}
              <code className="font-semibold text-asphalt">{site.url}/sitemap.xml</code>
            </p>
            <SectionFooter><button className={btnPrimary}>Save verification</button></SectionFooter>
          </form>
        </Card>

        <Card title="SEO for the homepage">
          <form action={saveSeo} className="space-y-4">
            <FormField label="Title shown in Google" htmlFor="title" hint={`Up to 70 characters. Leave blank to use: “Compare Car Insurance Quotes | ${site.name}”.`}>
              <input id="title" name="title" defaultValue={seo.title} maxLength={70} placeholder={`Compare Car Insurance Quotes | ${site.name}`} className={inputCls} />
            </FormField>
            <FormField label="Description shown in Google" htmlFor="description" hint="Up to 170 characters. Leave blank to use the default.">
              <textarea id="description" name="description" defaultValue={seo.description} maxLength={170} rows={3} placeholder={site.description} className={`${inputCls} h-auto py-2.5`} />
            </FormField>
            <SectionFooter><button className={btnPrimary}>Save SEO</button></SectionFooter>
          </form>
        </Card>

        <Card title="Quote results page">
          <form action={saveResults} className="space-y-4">
            <FormField label="Disclaimer shown above the quotes" htmlFor="disclaimer" hint="Explain that prices are estimates. Leave blank to hide it (not recommended).">
              <textarea id="disclaimer" name="disclaimer" defaultValue={results.disclaimer} maxLength={600} rows={5} className={`${inputCls} h-auto py-2.5`} />
            </FormField>
            <SectionFooter><button className={btnPrimary}>Save results text</button></SectionFooter>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Share images (Open Graph)">
          <p className="max-w-3xl text-sm leading-relaxed text-road">
            One branded template creates the preview picture shown when a page is shared on Facebook, LinkedIn, X, WhatsApp or Slack.
            Each page fills in its own variables: <code className="font-semibold text-asphalt">{"{eyebrow}"}</code>,{" "}
            <code className="font-semibold text-asphalt">{"{title}"}</code>, <code className="font-semibold text-asphalt">{"{subtitle}"}</code>,{" "}
            <code className="font-semibold text-asphalt">{"{price}"}</code>, <code className="font-semibold text-asphalt">{"{priceNote}"}</code> and{" "}
            <code className="font-semibold text-asphalt">{"{image}"}</code>. Try them below.
          </p>
          <div className="mt-5 grid gap-6 xl:grid-cols-[360px_1fr]">
            <form action="/admin/settings" className="space-y-3">
              <FormField label="{eyebrow}" htmlFor="og_eyebrow"><input id="og_eyebrow" name="og_eyebrow" defaultValue={og.eyebrow} maxLength={40} className={inputCls} /></FormField>
              <FormField label="{title}" htmlFor="og_title"><input id="og_title" name="og_title" defaultValue={og.title} maxLength={90} className={inputCls} /></FormField>
              <FormField label="{subtitle}" htmlFor="og_subtitle"><input id="og_subtitle" name="og_subtitle" defaultValue={og.subtitle} maxLength={140} className={inputCls} /></FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="{price}" htmlFor="og_price"><input id="og_price" name="og_price" defaultValue={og.price} maxLength={24} className={inputCls} /></FormField>
                <FormField label="{priceNote}" htmlFor="og_priceNote"><input id="og_priceNote" name="og_priceNote" defaultValue={og.priceNote} maxLength={40} className={inputCls} /></FormField>
              </div>
              <FormField label="{image}" htmlFor="og_image">
                <select id="og_image" name="og_image" defaultValue={og.image} className={inputCls}>
                  {OG_IMAGES.map((i) => <option key={i} value={i}>{i || "No image (show logo mark)"}</option>)}
                </select>
              </FormField>
              <button className={btnPrimary}>Preview</button>
            </form>
            <div>
              <img src={previewSrc} alt="Share image preview" width={1200} height={630} className="w-full rounded-lg border border-[#E4E7EC] shadow-sm" />
              <p className="mt-2 text-xs text-road">1200 × 630 px, the size every major network uses.</p>
            </div>
          </div>

          <p className="mt-8 text-sm font-semibold">Cards used by your pages</p>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PAGE_CARDS.map((c) => (
              <li key={c.path} className="rounded-lg border border-[#EEF0F3] p-2">
                <img src={c.src} alt={`Share image for ${c.page}`} width={1200} height={630} loading="lazy" className="w-full rounded" />
                <p className="mt-2 px-1 text-sm font-medium">{c.page} <span className="font-normal text-road">{c.path}</span></p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
