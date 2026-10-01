import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { cancelSignIn, signIn, verifyCode } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

const input =
  "block h-11 w-full rounded-lg border border-[#D0D5DD] bg-white px-3.5 text-[15px] text-asphalt shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-road/45 focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15";
const button = "inline-flex h-11 w-full items-center justify-center rounded-lg bg-asphalt text-[15px] font-semibold text-white transition hover:bg-road";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ step?: string; error?: string; next?: string }> }) {
  const { step, error, next = "/admin" } = await searchParams;
  const session = await getSession();
  if (session && !session.mfaPending) redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
  const codeStep = step === "code" && session?.mfaPending;
  const firstRun = !codeStep && (await db.adminUser.count()) === 0;

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#1F5FAD_0%,#101828_55%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <img src="/brand/logo.webp" alt={site.name} width={720} height={169} className="h-11 w-auto rounded-lg bg-white px-3 py-2" />
        </div>
        <div className="rounded-2xl bg-white p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]">
          <h1 className="text-xl font-bold">{codeStep ? "Enter your security code" : "Sign in to the admin"}</h1>
          <p className="mt-1 text-sm text-road">
            {codeStep ? "Open your authenticator app and enter the 6-digit code for this account." : "Use your work email and password."}
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {firstRun && (
            <p className="mt-4 rounded-lg border border-sky/20 bg-sky/5 px-3 py-2.5 text-xs leading-relaxed text-road">
              <strong className="text-asphalt">First-time setup:</strong> sign in with the ADMIN_USER and ADMIN_PASSWORD from your .env file. This creates the owner account.
            </p>
          )}

          {codeStep ? (
            <>
              <form action={verifyCode} className="mt-5 space-y-4">
                <input type="hidden" name="next" value={next} />
                <label htmlFor="code" className="sr-only">6-digit code</label>
                <input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9 ]{6,7}"
                  maxLength={7}
                  required
                  autoFocus
                  placeholder="123 456"
                  className={`${input} text-center text-2xl tracking-[0.4em]`}
                />
                <button className={button}>Verify and sign in</button>
              </form>
              <form action={cancelSignIn} className="mt-3 text-center">
                <button className="text-sm font-medium text-road hover:text-asphalt">Use a different account</button>
              </form>
            </>
          ) : (
            <form action={signIn} className="mt-5 space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
                <input id="email" name="email" type="text" autoComplete="username" required autoFocus className={input} />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
              </div>
              <button className={button}>Sign in</button>
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-xs text-white/50">Forgot your password? Ask the account owner to reset it.</p>
      </div>
    </main>
  );
}
