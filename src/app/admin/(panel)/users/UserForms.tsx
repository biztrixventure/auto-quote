"use client";

import { useActionState, useState } from "react";
import { createUser, resetUserPassword, type UserFormState } from "./actions";

const input =
  "block h-10 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)] focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15";

// Shows a new temporary password once. It never goes into the URL, so it isn't kept in history or logs.
function TempPassword({ state }: { state: UserFormState }) {
  const [copied, setCopied] = useState(false);
  if (state.error) return <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>;
  if (!state.tempPassword) return null;
  return (
    <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <p className="font-semibold">{state.ok}</p>
      <p className="mt-1">
        Temporary password for <strong>{state.forEmail}</strong> (shown once, share it privately):
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 rounded bg-white px-2 py-1.5 font-mono text-base text-asphalt">{state.tempPassword}</code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(state.tempPassword!).then(() => setCopied(true))}
          className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-100"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs">Ask them to change it under My account after signing in.</p>
    </div>
  );
}

export function CreateUserForm({ roles }: { roles: [string, string][] }) {
  const [state, action, pending] = useActionState(createUser, {});
  return (
    <form action={action}>
      <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr_160px_auto] sm:items-end">
        <label className="text-sm font-medium">Name<input name="name" required maxLength={80} className={`${input} mt-1.5`} /></label>
        <label className="text-sm font-medium">Email<input name="email" type="email" required maxLength={200} className={`${input} mt-1.5`} /></label>
        <label className="text-sm font-medium">
          Role
          <select name="role" defaultValue="agent" className={`${input} mt-1.5`}>
            {roles.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <button disabled={pending} className="h-10 rounded-lg bg-asphalt px-4 text-sm font-semibold text-white hover:bg-road disabled:opacity-60">
          {pending ? "Adding…" : "Add user"}
        </button>
      </div>
      <TempPassword state={state} />
    </form>
  );
}

export function ResetPasswordButton({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(resetUserPassword, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        disabled={pending}
        onClick={(e) => {
          if (!confirm(`Reset ${name}'s password? They'll be signed out everywhere.`)) e.preventDefault();
        }}
        className="text-sm font-semibold text-sky hover:underline disabled:opacity-60"
      >
        {pending ? "Resetting…" : "Reset password"}
      </button>
      <TempPassword state={state} />
    </form>
  );
}
