import { requireAdmin } from "@/lib/admin-guard";
import { ogUrl } from "@/lib/og";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import { Checkbox, FormField, Notice, SectionFooter, inputCls } from "@/components/admin/forms";
import { Card, PageHeader, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { saveAiSettings, saveBusiness, saveIndexNow, saveNotifications, saveResults, saveSeo, saveTracking, saveVerification, submitAllToIndexNow, testAlerts } from "./actions";
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
  const { tracking, verification, seo, results, business, notifications, indexnow, ai } = s;
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
            <FormField label="License note" htmlFor="b-license" hint="Shown in the footer: what your business is (e.g. a referral service, not an insurance company). If you hold an insurance license, add your NPN and states here.">
              <textarea id="b-license" name="licenseNote" defaultValue={business.licenseNote} maxLength={400} rows={2} className={`${inputCls} h-auto py-2.5`} />
            </FormField>
            <FormField
              label="Car insurance consent (shown above “See my quotes”)"
              htmlFor="b-consent"
              hint={<>Current version: <strong className="text-asphalt">{business.consentVersion}</strong>. Changing the wording creates a new version automatically, so every lead records exactly what it agreed to. Have your lawyer approve this text.</>}
            >
              <textarea id="b-consent" name="consentText" defaultValue={business.consentText} maxLength={2000} rows={6} required className={`${inputCls} h-auto py-2.5`} />
            </FormField>
            <FormField
              label="Service contract consent (shown above “Get my quote” on the vehicle service contract form)"
              htmlFor="b-vsc-consent"
              hint={<>Current version: <strong className="text-asphalt">{business.vscConsentVersion}</strong>. Must name vehicle service contracts, not insurance. Have your lawyer approve this text too.</>}
            >
              <textarea id="b-vsc-consent" name="vscConsentText" defaultValue={business.vscConsentText} maxLength={2000} rows={6} required className={`${inputCls} h-auto py-2.5`} />
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

        <Card title="Search engines" action={<Status on={!!(verification.google || verification.bing || verification.yandex)} />}>
          <form action={saveVerification} className="space-y-5">
            <div className="rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-xs leading-relaxed text-road">
              <p className="font-semibold text-asphalt">Your sitemap (submit it in every tool below)</p>
              <code className="mt-1 block select-all break-all text-[13px] font-semibold text-sky">{site.url}/sitemap.xml</code>
              <p className="mt-1">It lists every page, blog post and category and updates itself.</p>
            </div>
            {([
              ["google", "Google Search Console", "https://search.google.com/search-console", "Add property → URL prefix → enter your site address → HTML tag. Copy the tag, paste it here, Save, then click Verify in Google. Then open Sitemaps and submit the sitemap above.", '<meta name="google-site-verification" content="…" />'],
              ["bing", "Bing Webmaster Tools", "https://www.bing.com/webmasters", "Quickest: “Import from Google Search Console”, which needs no code. Or add your site → HTML meta tag → paste it here. Bing also powers DuckDuckGo and Yahoo results.", '<meta name="msvalidate.01" content="…" />'],
              ["yandex", "Yandex Webmaster", "https://webmaster.yandex.com", "Add site → Meta tag. Paste it here, Save, then click Check in Yandex. Then go to Indexing → Sitemap files and add the sitemap above.", '<meta name="yandex-verification" content="…" />'],
              ["meta", "Meta (Facebook) domain", "https://business.facebook.com/settings", "Business Settings → Brand safety → Domains → Add → Meta-tag verification. Needed to run Facebook and Instagram ads with your domain.", '<meta name="facebook-domain-verification" content="…" />'],
            ] as const).map(([key, label, url, hint, placeholder]) => (
              <FormField
                key={key}
                label={label}
                htmlFor={key}
                hint={<>{hint} <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-sky hover:underline">Open ↗</a></>}
              >
                <div className="flex items-center gap-2">
                  <input id={key} name={key} defaultValue={verification[key]} placeholder={placeholder} className={inputCls} autoComplete="off" />
                  {verification[key] && <span title="Code saved" className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Saved</span>}
                </div>
              </FormField>
            ))}
            <SectionFooter><button className={btnPrimary}>Save codes</button></SectionFooter>
          </form>

          <div className="-mx-5 -mb-5 mt-5 border-t border-[#EEF0F3] bg-[#FCFCFD] px-5 py-4">
            <p className="text-sm font-semibold">IndexNow: instant indexing for Bing and Yandex</p>
            <p className="mt-1 text-xs leading-relaxed text-road">
              When you publish or update a blog post or page, Bing, Yandex and other IndexNow engines are told right away, so new content can appear in hours instead of weeks. Google finds updates through your sitemap.
            </p>
            <form action={saveIndexNow} className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="enabled" defaultChecked={indexnow.enabled} className="h-4 w-4 accent-sky" />
                Send new and updated pages automatically
              </label>
              <button className={btnSecondary}>Save</button>
            </form>
            {indexnow.enabled && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-road">
                <span>
                  Key file: <code className="text-asphalt">{site.url}/indexnow.txt</code>
                  {indexnow.lastSubmitted && <> · Last sent {new Date(indexnow.lastSubmitted).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}: {indexnow.lastResult}</>}
                </span>
                <form action={submitAllToIndexNow}>
                  <button className={btnSecondary}>Submit all pages now</button>
                </form>
              </div>
            )}
            {!site.url.startsWith("https://") && <p className="mt-2 text-xs text-amber-700">IndexNow only sends once the site runs on its real https:// address (SITE_URL).</p>}
          </div>
        </Card>

        <Card title="AI search (ChatGPT, Perplexity, Claude, Google AI)">
          <form action={saveAiSettings} className="space-y-4">
            <p className="text-sm leading-relaxed text-road">
              More people ask AI assistants instead of searching. These settings help them read and quote your site.
            </p>
            <Checkbox name="allowSearchBots" defaultChecked={ai.allowSearchBots} label="Let AI assistants read the site to answer questions" hint="ChatGPT search, Perplexity, Claude and others visit pages to answer and link to them. Keep this on: it brings visitors." />
            <Checkbox name="allowTrainingBots" defaultChecked={ai.allowTrainingBots} label="Allow AI training crawlers" hint="GPTBot, ClaudeBot, Google-Extended and others collect pages to train AI models. Turning this off doesn't affect Google or Bing search results." />
            <Checkbox name="llmsTxt" defaultChecked={ai.llmsTxt} label="Publish /llms.txt" hint="A plain summary of your site, every state guide and your latest posts, written for AI tools. It updates itself." />
            <p className="rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-xs leading-relaxed text-road">
              Check them: <a href="/llms.txt" target="_blank" rel="noreferrer" className="font-semibold text-sky hover:underline">/llms.txt</a> ·{" "}
              <a href="/robots.txt" target="_blank" rel="noreferrer" className="font-semibold text-sky hover:underline">/robots.txt</a>. Clear answers, FAQs and the &ldquo;Quick answer&rdquo; boxes on state guides are what AI tools quote most.
            </p>
            <SectionFooter><button className={btnPrimary}>Save AI settings</button></SectionFooter>
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
