"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImagePicker } from "../blog/ImagePicker";
import { RichEditor } from "../blog/RichEditor";
import { deletePage, savePage, type PageInput } from "./actions";

export type EditorPage = Omit<PageInput, "id"> & { id?: string };

const input = "block h-10 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-road/45 focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15";
const slugOf = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

function Panel({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-road">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
const Counter = ({ n, good, max }: { n: number; good: [number, number]; max: number }) => (
  <span className={`text-xs tabular-nums ${n === 0 ? "text-road" : n >= good[0] && n <= good[1] ? "text-emerald-600" : n > max ? "text-red-600" : "text-amber-600"}`}>{n}/{good[1]}</span>
);

export function PageEditor({ page, siteUrl }: { page: EditorPage; siteUrl: string }) {
  const router = useRouter();
  const [p, setP] = useState(page);
  const [slugTouched, setSlugTouched] = useState(!!page.id);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [picker, setPicker] = useState(false);
  const [words, setWords] = useState(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const set = <K extends keyof EditorPage>(k: K, v: EditorPage[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };
  const live = p.status === "published";
  const host = siteUrl.replace(/^https?:\/\//, "");

  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [p.title]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(status: "draft" | "published") {
    if (saving) return;
    if (status === "draft" && live && !window.confirm("Take this page off the website? It becomes a draft and links to it stop working.")) return;
    setSaving(true);
    setNotice(null);
    try {
      const r = await savePage({ ...p, status });
      if (!r.ok) return setNotice({ ok: false, text: r.error });
      setP((x) => ({ ...x, status: r.status as "draft" | "published", slug: r.slug }));
      setSlugTouched(true);
      setDirty(false);
      setNotice({ ok: true, text: r.message });
      if (!p.id) {
        setP((x) => ({ ...x, id: r.id }));
        router.replace(`/admin/pages/${r.id}`);
      } else router.refresh();
    } catch {
      setNotice({ ok: false, text: "Couldn't save. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current(live ? "published" : "draft");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live]);

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-[#E4E7EC] bg-[#F6F7F9]/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <Link href="/admin/pages" className="text-sm font-semibold text-road hover:text-asphalt">← All pages</Link>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${live ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F4F7] text-road"}`}>{live ? "Published" : "Draft"}</span>
        <span className="text-xs text-road">{saving ? "Saving…" : dirty ? "Unsaved changes" : ""}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {p.id && (
            <a href={live ? `/${p.slug}` : `/preview/page/${p.id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">
              {live ? "View page ↗" : "Preview ↗"}
            </a>
          )}
          {!live && (
            <button type="button" onClick={() => void save("draft")} disabled={saving} className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-sm font-semibold hover:bg-[#F9FAFB] disabled:opacity-60">Save draft</button>
          )}
          <button type="button" onClick={() => void save("published")} disabled={saving} className="rounded-lg bg-asphalt px-4 py-2 text-sm font-semibold text-white hover:bg-road disabled:opacity-60">
            {live ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      {notice && (
        <div role={notice.ok ? "status" : "alert"} className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {notice.text}
          {notice.ok && live && <Link href="/admin/menus" className="ml-2 font-semibold underline">Open Menus</Link>}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-[#E4E7EC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-10">
            <textarea
              ref={titleRef}
              value={p.title}
              rows={1}
              maxLength={120}
              placeholder="Page title, e.g. About us"
              aria-label="Page title"
              onChange={(e) => {
                const v = e.target.value.replace(/\n/g, " ");
                set("title", v);
                if (!slugTouched) setP((x) => ({ ...x, slug: slugOf(v) }));
              }}
              className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-3xl font-extrabold leading-tight tracking-tight text-asphalt placeholder:text-road/35 focus:outline-none focus:ring-0 sm:text-4xl"
            />
            <label className="mt-3 flex flex-wrap items-center gap-1 text-sm text-road">
              <span className="shrink-0">{host}/</span>
              <input
                value={p.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugOf(e.target.value) + (e.target.value.endsWith("-") ? "-" : ""));
                }}
                aria-label="Web address"
                placeholder="page-address"
                className="min-w-[200px] flex-1 rounded-md border border-transparent bg-[#F6F7F9] px-2 py-1 font-medium text-asphalt hover:border-[#D0D5DD] focus:border-sky focus:bg-white focus:outline-none"
              />
            </label>
            <textarea value={p.intro} onChange={(e) => set("intro", e.target.value)} maxLength={300} rows={2} placeholder="Short line under the title (optional)" aria-label="Intro" className="mt-4 block w-full resize-none rounded-lg border border-transparent bg-[#F6F7F9] px-3 py-2 text-[15px] text-road hover:border-[#D0D5DD] focus:border-sky focus:bg-white focus:outline-none" />
          </div>
          <RichEditor initialHtml={page.content} onWords={setWords} onChange={(html) => set("content", html)} />
          <p className="text-xs text-road">{words.toLocaleString()} words · Ctrl+S to save</p>
        </div>

        <aside className="space-y-4">
          <Panel title="Layout">
            {([["standard", "Standard", "Comfortable reading width. Best for text pages."], ["wide", "Wide", "Full page width. For tables and image-heavy pages."]] as const).map(([v, l, h]) => (
              <label key={v} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#E4E7EC] p-3 text-sm has-[:checked]:border-sky has-[:checked]:bg-sky/5">
                <input type="radio" name="layout" checked={p.layout === v} onChange={() => set("layout", v)} className="mt-0.5 h-4 w-4 accent-sky" />
                <span><span className="font-semibold">{l}</span><span className="block text-xs text-road">{h}</span></span>
              </label>
            ))}
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={p.showQuoteCta} onChange={(e) => set("showQuoteCta", e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky" />
              <span className="font-medium">Show the quote box at the bottom <span className="block text-xs font-normal text-road">Turns visitors into leads.</span></span>
            </label>
          </Panel>

          <Panel title="Top image" hint="Optional. Shown under the title. Best size: 1600 × 900.">
            {p.coverImageId ? (
              <div className="space-y-2">
                <img src={`/media/${p.coverImageId}`} alt="" className="aspect-[16/9] w-full rounded-lg border border-[#EEF0F3] object-cover" />
                <input value={p.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} maxLength={200} placeholder="Describe the image (alt text)" aria-label="Image description" className={input} />
                <div className="flex gap-3 text-xs font-semibold">
                  <button type="button" onClick={() => setPicker(true)} className="text-sky hover:underline">Change</button>
                  <button type="button" onClick={() => set("coverImageId", null)} className="text-red-700 hover:underline">Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setPicker(true)} className="grid aspect-[16/9] w-full place-items-center rounded-lg border-2 border-dashed border-[#D0D5DD] text-sm font-semibold text-road hover:border-sky hover:text-sky">+ Add image</button>
            )}
          </Panel>

          <Panel title="Search engines (SEO)">
            <div className="rounded-lg border border-[#EEF0F3] bg-[#FCFCFD] p-3">
              <p className="truncate text-xs text-[#202124]">{host}/{p.slug || "page-address"}</p>
              <p className="mt-0.5 line-clamp-1 text-[17px] leading-snug text-[#1A0DAB]">{p.seoTitle || p.title || "Page title"}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#4D5156]">{p.seoDescription || p.intro || "Add a description so Google shows a good summary."}</p>
            </div>
            <label className="block text-sm font-medium">
              <span className="flex justify-between">SEO title <Counter n={p.seoTitle.length} good={[30, 60]} max={70} /></span>
              <input value={p.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={70} placeholder={p.title || "Defaults to the page title"} className={`${input} mt-1.5`} />
            </label>
            <label className="block text-sm font-medium">
              <span className="flex justify-between">Meta description <Counter n={p.seoDescription.length} good={[120, 160]} max={200} /></span>
              <textarea value={p.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} maxLength={200} rows={3} placeholder="Defaults to the intro" className={`${input} mt-1.5 h-auto py-2`} />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={p.noindex} onChange={(e) => set("noindex", e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky" />
              <span>Hide from Google <span className="block text-xs text-road">For thank-you pages, ad landing pages and similar.</span></span>
            </label>
          </Panel>

          {p.id && (
            <Panel title="More">
              {live && <button type="button" onClick={() => void save("draft")} className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">Unpublish</button>}
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Delete this page for good? Menu links to it will stop working.")) return;
                  await deletePage(p.id!);
                  setDirty(false);
                  router.push("/admin/pages");
                }}
                className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Delete page
              </button>
            </Panel>
          )}
        </aside>
      </div>

      <ImagePicker open={picker} title="Top image" onClose={() => setPicker(false)} onPick={(img) => { set("coverImageId", img.id); if (img.alt) set("coverAlt", img.alt); }} />
    </div>
  );
}
