"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadImage } from "../ImagePicker";

export function MediaUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const f of Array.from(files)) await uploadImage(f);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span role="alert" className="text-sm font-medium text-red-700">{error}</span>}
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-asphalt px-3.5 py-2 text-sm font-semibold text-white hover:bg-road disabled:opacity-60">
        {busy ? "Uploading…" : "+ Upload images"}
      </button>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
    </div>
  );
}

export function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="font-semibold text-sky hover:underline"
    >
      {done ? "Copied" : "Copy link"}
    </button>
  );
}
