"use client";

import { useFormStatus } from "react-dom";

export function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-asphalt px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-road disabled:opacity-60"
    >
      {pending ? "Saving…" : "Update status"}
    </button>
  );
}
