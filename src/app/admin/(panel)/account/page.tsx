import QRCode from "qrcode";
import { getSession, ROLES, totpUri, type Role } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { FormField, Notice, SectionFooter, inputCls } from "@/components/admin/forms";
import { Card, PageHeader, btnPrimary, btnSecondary, dateTime, timeAgo } from "@/components/admin/ui";
import { changePassword, confirmTwoFactor, disableTwoFactor, signOutEverywhereElse, startTwoFactor, updateName } from "./actions";

export const dynamic = "force-dynamic";

function device(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${os ? ` on ${os}` : ""}`;
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; setup2fa?: string }> }) {
  const me = await requireAdmin();
  const [sp, current, sessions] = await Promise.all([
    searchParams,
    getSession(),
    db.adminSession.findMany({ where: { userId: me.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  const settingUp = !me.totpEnabled && !!me.totpSecret && sp.setup2fa === "1";
  const qr = settingUp ? await QRCode.toString(totpUri(me.totpSecret!, me.email, site.name), { type: "svg", margin: 1, width: 200 }) : null;
  const secretGroups = me.totpSecret?.match(/.{1,4}/g)?.join(" ");

  return (
    <>
      <PageHeader title="My account" subtitle={`${me.email} · ${ROLES[me.role as Role] ?? me.role}`} />
      <Notice saved={sp.saved} error={sp.error} />
      {sp.setup2fa === "1" && !me.totpEnabled && !settingUp && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Protect your account:</strong> admins and owners should turn on two-factor sign-in. It takes about a minute.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Two-factor sign-in" action={<span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${me.totpEnabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{me.totpEnabled ? "On" : "Off"}</span>}>
          {me.totpEnabled ? (
            <form action={disableTwoFactor} className="space-y-4">
              <p className="text-sm text-road">Each sign-in asks for a 6-digit code from your authenticator app. To turn it off, confirm with your password and a current code.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Password" htmlFor="d-password"><input id="d-password" name="password" type="password" required autoComplete="current-password" className={inputCls} /></FormField>
                <FormField label="Current code" htmlFor="d-code"><input id="d-code" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={7} className={inputCls} /></FormField>
              </div>
              <SectionFooter><button className={btnSecondary}>Turn off two-factor</button></SectionFooter>
            </form>
          ) : settingUp ? (
            <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
              <div className="rounded-lg border border-[#E4E7EC] bg-white p-2" dangerouslySetInnerHTML={{ __html: qr! }} />
              <form action={confirmTwoFactor} className="space-y-3">
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-road">
                  <li>Open Google Authenticator, Microsoft Authenticator, 1Password or Authy.</li>
                  <li>Scan this QR code, or enter the key: <code className="break-all font-semibold text-asphalt">{secretGroups}</code></li>
                  <li>Type the 6-digit code the app shows.</li>
                </ol>
                <FormField label="6-digit code" htmlFor="code">
                  <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={7} autoFocus className={`${inputCls} text-lg tracking-[0.3em]`} />
                </FormField>
                <button className={btnPrimary}>Turn on two-factor</button>
              </form>
            </div>
          ) : (
            <form action={startTwoFactor} className="space-y-3">
              <p className="text-sm text-road">Add a second step to sign-in: a code from an app on your phone. Even if someone learns your password, they can&apos;t get in without your phone.</p>
              <button className={btnPrimary}>Set up two-factor</button>
            </form>
          )}
        </Card>

        <Card title="Change password">
          <form action={changePassword} className="space-y-4">
            <FormField label="Current password" htmlFor="current"><input id="current" name="current" type="password" required autoComplete="current-password" className={inputCls} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="New password" htmlFor="password" hint="At least 12 characters, with numbers or symbols."><input id="password" name="password" type="password" required minLength={12} autoComplete="new-password" className={inputCls} /></FormField>
              <FormField label="Repeat new password" htmlFor="confirm"><input id="confirm" name="confirm" type="password" required minLength={12} autoComplete="new-password" className={inputCls} /></FormField>
            </div>
            <SectionFooter><button className={btnPrimary}>Change password</button></SectionFooter>
          </form>
        </Card>

        <Card title="Profile">
          <form action={updateName} className="space-y-4">
            <FormField label="Your name" htmlFor="name" hint="Shown on notes and in the activity log."><input id="name" name="name" defaultValue={me.name} required maxLength={80} className={inputCls} /></FormField>
            <FormField label="Sign-in email" htmlFor="email" hint="Ask the account owner to change this."><input id="email" value={me.email} readOnly disabled className={inputCls} /></FormField>
            <SectionFooter><button className={btnPrimary}>Save</button></SectionFooter>
          </form>
        </Card>

        <Card title={`Where you're signed in (${sessions.length})`}>
          <ul className="-my-2 divide-y divide-[#EEF0F3] text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="font-medium">{device(s.userAgent)}</span>
                  {s.id === current?.id && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">This device</span>}
                  <span className="block text-xs text-road" title={dateTime(s.createdAt)}>Signed in {timeAgo(s.createdAt)} · IP {s.ipAddress ?? "unknown"}</span>
                </span>
              </li>
            ))}
          </ul>
          {sessions.length > 1 && (
            <form action={signOutEverywhereElse}>
              <SectionFooter><button className={btnSecondary}>Sign out everywhere else</button></SectionFooter>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
