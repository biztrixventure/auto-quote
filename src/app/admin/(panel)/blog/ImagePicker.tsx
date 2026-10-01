"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listMedia } from "./actions";

export type PickedImage = { id: string; url: string; width: number; height: number; alt?: string };
type LibraryItem = { id: string; url: string; fileName: string; width: number; height: number; alt: string };

/** Uploads one image file; returns it or throws with a readable message. */
export async function uploadImage(file: File, kind: "image" | "avatar" = "image"): Promise<PickedImage> {
  const body = new FormData();
  body.set("file", file);
  body.set("kind", kind);
  const res = await fetch("/api/admin/media", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as Partial<PickedImage> & { error?: string };
  if (!res.ok || !json.id) throw new Error(json.error || "Upload failed. Try again.");
  return json as PickedImage;
}

/** Modal: upload a new image or pick one from the library, with alt text. */
export function ImagePicker({ open, onClose, onPick, askAlt = true, title = "Add an image" }: { open: boolean; onClose: () => void; onPick: (img: PickedImage) => void; askAlt?: boolean; title?: string }) {
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [alt, setAlt] = useState("");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (open) {
      setPicked(null);
      setAlt("");
      setError("");
    }
  }, [open]);

  const loadLibrary = useCallback(async (p: number) => {
    setBusy(true);
    try {
      const r = await listMedia(p);
      setItems((prev) => (p === 0 ? r.items : [...prev, ...r.items]));
      setMore(r.more);
      setPage(p);
    } catch {
      setError("Couldn't load your images.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === "library") void loadLibrary(0);
  }, [open, tab, loadLibrary]);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const img = await uploadImage(file);
      setPicked(img);
      setAlt(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
      if (!askAlt) finish(img, "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function finish(img: PickedImage, altText: string) {
    onPick({ ...img, alt: altText.trim() });
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="w-[min(760px,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-[#101828]/50"
    >
      <div className="flex items-center justify-between border-b border-[#EEF0F3] px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-road hover:bg-[#F2F4F7]">
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>

      {picked ? (
        <div className="space-y-4 p-5">
          <img src={picked.url} alt="" className="mx-auto max-h-72 rounded-lg border border-[#EEF0F3] object-contain" />
          {askAlt && (
            <label className="block text-sm font-medium">
              Describe the image (alt text)
              <input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                maxLength={200}
                autoFocus
                placeholder="e.g. Mechanic checking a car engine"
                className="mt-1.5 block h-10 w-full rounded-lg border border-[#D0D5DD] px-3 text-sm focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15"
              />
              <span className="mt-1 block text-xs font-normal text-road">Helps Google and visitors using screen readers.</span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPicked(null)} className="rounded-lg border border-[#D0D5DD] px-3.5 py-2 text-sm font-semibold">Back</button>
            <button type="button" onClick={() => finish(picked, alt)} className="rounded-lg bg-asphalt px-3.5 py-2 text-sm font-semibold text-white hover:bg-road">Use this image</button>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="mb-4 flex gap-1 rounded-lg bg-[#F2F4F7] p-1 text-sm font-semibold">
            {(["upload", "library"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 rounded-md px-3 py-1.5 ${tab === t ? "bg-white shadow-sm" : "text-road"}`}>
                {t === "upload" ? "Upload new" : "Your images"}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                void handleFiles(e.dataTransfer.files);
              }}
              className={`grid place-items-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${drag ? "border-sky bg-sky/5" : "border-[#D0D5DD]"}`}
            >
              <svg aria-hidden width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-road/60"><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
              <p className="mt-3 font-semibold">{busy ? "Uploading…" : "Drop an image here"}</p>
              <p className="mt-1 text-sm text-road">JPG, PNG, WebP or AVIF, up to 10 MB. It is resized and compressed for you.</p>
              <button type="button" disabled={busy} onClick={() => input.current?.click()} className="mt-4 rounded-lg bg-asphalt px-4 py-2 text-sm font-semibold text-white hover:bg-road disabled:opacity-60">
                Choose a file
              </button>
              <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
            </div>
          ) : (
            <div>
              {items.length === 0 && !busy && <p className="py-12 text-center text-sm text-road">No images yet. Upload one first.</p>}
              <ul className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
                {items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked({ id: m.id, url: m.url, width: m.width, height: m.height });
                        setAlt(m.alt);
                        if (!askAlt) finish({ id: m.id, url: m.url, width: m.width, height: m.height }, m.alt);
                      }}
                      className="group block w-full overflow-hidden rounded-lg border border-[#EEF0F3] hover:border-sky"
                    >
                      <img src={m.url} alt={m.alt} loading="lazy" className="aspect-square w-full object-cover transition group-hover:scale-105" />
                    </button>
                  </li>
                ))}
              </ul>
              {more && (
                <button type="button" disabled={busy} onClick={() => void loadLibrary(page + 1)} className="mt-4 w-full rounded-lg border border-[#D0D5DD] py-2 text-sm font-semibold">
                  {busy ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          )}
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        </div>
      )}
    </dialog>
  );
}
