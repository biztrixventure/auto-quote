"use client";

import { useRef, useState } from "react";
import { uploadImage } from "../blog/ImagePicker";

// Author photo: uploads straight away (cropped to a square), saved with the profile form.
export function AvatarField({ initialId, name }: { initialId: string | null; name: string }) {
  const [id, setId] = useState(initialId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      setId((await uploadImage(f, "avatar")).id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">Author photo</p>
      <div className="flex items-center gap-4">
        {id ? (
          <img src={`/media/${id}`} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="grid h-16 w-16 place-items-center rounded-full bg-asphalt text-xl font-semibold text-white">{name.charAt(0).toUpperCase()}</span>
        )}
        <div className="flex gap-3 text-sm font-semibold">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="text-sky hover:underline disabled:opacity-60">
            {busy ? "Uploading…" : id ? "Change photo" : "Upload photo"}
          </button>
          {id && <button type="button" onClick={() => setId("")} className="text-red-700 hover:underline">Remove</button>}
        </div>
      </div>
      <input type="hidden" name="avatarId" value={id} />
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files)} />
      {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      {id !== (initialId ?? "") && <p className="mt-2 text-xs text-road">Click Save to keep the new photo.</p>}
    </div>
  );
}
