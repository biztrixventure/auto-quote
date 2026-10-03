"use client";

import { useActionState, useState } from "react";
import { createKey, type NewKeyState } from "./actions";

const input =
  "block h-10 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)] focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15";

// The new key is shown once, here. It never goes into the URL, so it isn't kept in history or logs.
export function NewKeyForm() {
  const [state, action, pending] = useActionState<NewKeyState, FormData>(createKey, {});
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="text-sm font-medium">
          Key name
          <input name="name" required maxLength={60} placeholder="Claude blog writer" className={`${input} mt-1.5`} />
        </label>
        <button disabled={pending} className="inline-flex h-10 items-center justify-center rounded-lg bg-asphalt px-4 text-sm font-semibold text-white hover:bg-road disabled:opacity-60">
          {pending ? "Creating…" : "Create key"}
        </button>
      </div>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="canPublish" className="mt-0.5 h-4 w-4 accent-sky" />
        <span>
          <span className="font-medium">Allow publishing</span>
          <span className="block text-road">Off: the key can only save drafts and send them for review; you publish them in Admin → Blog. On: it can publish and update live posts.</span>
        </span>
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>}
      {state.token && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-semibold">{state.ok} Copy it now: it&apos;s shown only once.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 font-mono text-sm text-asphalt">{state.token}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(state.token!).then(() => setCopied(true))}
              className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-100"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs">Paste it into the <code>.env.blog</code> file on your computer. Never paste it into a chat, email or document.</p>
        </div>
      )}
    </form>
  );
}
