"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deletePost, getRevision, savePost, type PostInput, type PostIntent } from "./actions";
import { ImagePicker } from "./ImagePicker";
import { RichEditor } from "./RichEditor";

export type EditorPost = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string | null;
  tags: string;
  coverImageId: string | null;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  featured: boolean;
  status: string;
  publishedAt: string | null;
  authorName: string;
};
type Perms = { canEdit: boolean; canPublish: boolean; editor: boolean; canDelete: boolean };
type Revision = { id: string; createdAt: string; editor: string };

const input = "block h-10 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-road/45 focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15 disabled:bg-[#F9FAFB]";
const slugOf = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const ago = (iso: string) => {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function Panel({ title, children, hint }: { title: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-road">{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Counter({ n, good, max }: { n: number; good: [number, number]; max: number }) {
  const color = n === 0 ? "text-road" : n >= good[0] && n <= good[1] ? "text-emerald-600" : n > max ? "text-red-600" : "text-amber-600";
  return <span className={`text-xs tabular-nums ${color}`}>{n}/{good[1]}</span>;
}

export function PostEditor({ post, categories, revisions, perms, siteUrl }: { post: EditorPost; categories: { id: string; name: string }[]; revisions: Revision[]; perms: Perms; siteUrl: string }) {
  const router = useRouter();
  const [id, setId] = useState(post.id);
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [slugTouched, setSlugTouched] = useState(!!post.id);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [content, setContent] = useState(post.content);
  const [categoryId, setCategoryId] = useState(post.categoryId ?? "");
  const [tags, setTags] = useState(post.tags);
  const [cover, setCover] = useState<{ id: string; url: string } | null>(post.coverImageId ? { id: post.coverImageId, url: `/media/${post.coverImageId}` } : null);
  const [coverAlt, setCoverAlt] = useState(post.coverAlt);
  const [seoTitle, setSeoTitle] = useState(post.seoTitle);
  const [seoDescription, setSeoDescription] = useState(post.seoDescription);
  const [noindex, setNoindex] = useState(post.noindex);
  const [featured, setFeatured] = useState(post.featured);
  const [publishAt, setPublishAt] = useState(toLocal(post.publishedAt));
  const [status, setStatus] = useState(post.status);
  const [publishedAt, setPublishedAt] = useState(post.publishedAt);
  const [words, setWords] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<PostIntent | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [coverPicker, setCoverPicker] = useState(false);
  const [reset, setReset] = useState({ token: 0, html: "" });
  const [, tick] = useState(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const touch = useCallback(<T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  }, []);

  const scheduled = status === "published" && publishedAt && new Date(publishedAt) > new Date();
  const live = status === "published" && !scheduled;
  const readOnly = !perms.canEdit;
  const readMin = Math.max(1, Math.round(words / 220));
  const futureDate = publishAt && new Date(publishAt) > new Date();

  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  async function save(intent: PostIntent) {
    if (saving || readOnly) return;
    if (intent === "unpublish" && !window.confirm("Take this post off the blog? It becomes a draft again.")) return;
    setSaving(intent);
    setNotice(null);
    const payload: PostInput = {
      id,
      title,
      slug,
      excerpt,
      content,
      categoryId: categoryId || null,
      tags,
      coverImageId: cover?.id ?? null,
      coverAlt,
      seoTitle,
      seoDescription,
      noindex,
      featured,
      publishAt: publishAt ? new Date(publishAt).toISOString() : null,
      intent,
    };
    try {
      const r = await savePost(payload);
      if (!r.ok) {
        setNotice({ ok: false, text: r.error });
        return;
      }
      setStatus(r.status);
      setPublishedAt(r.publishedAt);
      setSlug(r.slug);
      setSlugTouched(true);
      setDirty(false);
      setSavedAt(new Date().toISOString());
      setNotice({ ok: true, text: r.message });
      if (!id) {
        setId(r.id);
        router.replace(`/admin/blog/${r.id}`);
      } else router.refresh();
    } catch {
      setNotice({ ok: false, text: "Couldn't save. Check your connection and try again." });
    } finally {
      setSaving(null);
    }
  }

  // Ctrl/Cmd+S saves (keeps a live post live).
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current(status === "published" && perms.canPublish ? "publish" : "draft");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, perms.canPublish]);

  async function remove() {
    if (!id || !window.confirm("Delete this post for good? This can't be undone.")) return;
    const r = await deletePost(id);
    if (!r.ok) return setNotice({ ok: false, text: r.error ?? "Couldn't delete." });
    setDirty(false);
    router.push("/admin/blog?saved=Post+deleted.");
  }

  async function restore(revId: string) {
    if (!window.confirm("Load this earlier version into the editor? Your current text is replaced (you can still undo by not saving).")) return;
    const r = await getRevision(revId);
    if (!r) return;
    setTitle(r.title);
    setExcerpt(r.excerpt);
    setContent(r.content);
    setReset((s) => ({ token: s.token + 1, html: r.content }));
    setDirty(true);
    setNotice({ ok: true, text: "Earlier version loaded. Save to keep it." });
  }

  const effectiveSeoTitle = seoTitle || title || "Post title";
  const effectiveDesc = seoDescription || excerpt || "Add a short summary so Google shows a good description.";
  const url = `${siteUrl.replace(/^https?:\/\//, "")}/blog/${slug || slugOf(title) || "your-post"}`;

  const badge = live ? ["Published", "bg-emerald-50 text-emerald-700"] : scheduled ? ["Scheduled", "bg-sky/10 text-sky"] : status === "review" ? ["In review", "bg-amber-50 text-amber-800"] : ["Draft", "bg-[#F2F4F7] text-road"];

  const primary = useMemo(() => {
    if (!perms.canPublish) return { intent: "review" as const, label: status === "review" ? "Update review copy" : "Send for review" };
    if (live) return { intent: "publish" as const, label: "Update" };
    if (futureDate) return { intent: "publish" as const, label: "Schedule" };
    return { intent: "publish" as const, label: "Publish" };
  }, [perms.canPublish, live, futureDate, status]);

  return (
    <div>
      {/* Top bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-[#E4E7EC] bg-[#F6F7F9]/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <Link href="/admin/blog" className="text-sm font-semibold text-road hover:text-asphalt">← All posts</Link>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge[1]}`}>{badge[0]}</span>
        <span className="text-xs text-road">{saving ? "Saving…" : dirty ? "Unsaved changes" : savedAt ? `Saved ${ago(savedAt)}` : ""}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {id && (
            <a href={live ? `/blog/${slug}` : `/blog/preview/${id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">
              {live ? "View post ↗" : "Preview ↗"}
            </a>
          )}
          {!readOnly && !live && (
            <button type="button" onClick={() => void save("draft")} disabled={!!saving} className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-sm font-semibold hover:bg-[#F9FAFB] disabled:opacity-60">
              {saving === "draft" ? "Saving…" : "Save draft"}
            </button>
          )}
          {!readOnly && (
            <button type="button" onClick={() => void save(primary.intent)} disabled={!!saving} className="rounded-lg bg-asphalt px-4 py-2 text-sm font-semibold text-white hover:bg-road disabled:opacity-60">
              {saving && saving !== "draft" ? "Saving…" : primary.label}
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div role={notice.ok ? "status" : "alert"} className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {notice.text}
        </div>
      )}
      {readOnly && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This post is live. Only an admin can change it now. Ask an admin if something needs fixing.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Writing area */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-[#E4E7EC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-10">
            <textarea
              ref={titleRef}
              value={title}
              disabled={readOnly}
              onChange={(e) => {
                const v = e.target.value.replace(/\n/g, " ");
                touch(setTitle)(v);
                if (!slugTouched) setSlug(slugOf(v));
              }}
              rows={1}
              maxLength={160}
              placeholder="Post title"
              aria-label="Post title"
              className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-3xl font-extrabold leading-tight tracking-tight text-asphalt placeholder:text-road/35 focus:outline-none focus:ring-0 sm:text-4xl"
            />
            <label className="mt-3 flex flex-wrap items-center gap-1 text-sm text-road">
              <span className="shrink-0">{siteUrl.replace(/^https?:\/\//, "")}/blog/</span>
              <input
                value={slug}
                disabled={readOnly}
                onChange={(e) => {
                  setSlugTouched(true);
                  touch(setSlug)(slugOf(e.target.value) + (e.target.value.endsWith("-") ? "-" : ""));
                }}
                aria-label="Web address"
                placeholder="post-address"
                className="min-w-[200px] flex-1 rounded-md border border-transparent bg-[#F6F7F9] px-2 py-1 font-medium text-asphalt hover:border-[#D0D5DD] focus:border-sky focus:bg-white focus:outline-none"
              />
            </label>
            {live && <p className="mt-1.5 text-xs text-amber-700">Changing the address of a live post breaks links people already shared.</p>}
          </div>

          {readOnly ? (
            <div className="post-content rounded-xl border border-[#E4E7EC] bg-white px-6 py-6 sm:px-10" dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <RichEditor initialHtml={post.content} reset={reset} onWords={setWords} onChange={touch(setContent)} />
          )}
          <p className="text-xs text-road">{words.toLocaleString()} words · about {readMin} min read · Ctrl+S to save</p>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Panel title="Publishing" hint={perms.canPublish ? undefined : "An admin reviews and publishes your post."}>
            {perms.canPublish && (
              <label className="block text-sm font-medium">
                Publish date
                <input type="datetime-local" value={publishAt} disabled={readOnly} onChange={(e) => touch(setPublishAt)(e.target.value)} className={`${input} mt-1.5`} />
                <span className="mt-1 block text-xs font-normal text-road">Leave empty to publish now. A future date schedules the post; it goes live by itself.</span>
              </label>
            )}
            {perms.editor && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={featured} onChange={(e) => touch(setFeatured)(e.target.checked)} className="h-4 w-4 accent-sky" />
                Feature at the top of the blog
              </label>
            )}
            <p className="text-xs text-road">Author: {post.authorName}</p>
            <div className="flex flex-wrap gap-2 border-t border-[#EEF0F3] pt-3">
              {perms.canPublish && (live || scheduled) && !readOnly && (
                <button type="button" onClick={() => void save("unpublish")} className="rounded-lg border border-[#D0D5DD] px-3 py-1.5 text-xs font-semibold hover:bg-[#F9FAFB]">Unpublish</button>
              )}
              {id && perms.canDelete && (
                <button type="button" onClick={() => void remove()} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button>
              )}
            </div>
          </Panel>

          <Panel title="Cover image" hint="Shown on the blog, at the top of the post and when shared on social media. Best size: 1600 × 900.">
            {cover ? (
              <div className="space-y-2">
                <img src={cover.url} alt="" className="aspect-[16/9] w-full rounded-lg border border-[#EEF0F3] object-cover" />
                <input value={coverAlt} disabled={readOnly} onChange={(e) => touch(setCoverAlt)(e.target.value)} maxLength={200} placeholder="Describe the image (alt text)" aria-label="Cover image description" className={input} />
                {!readOnly && (
                  <div className="flex gap-2 text-xs font-semibold">
                    <button type="button" onClick={() => setCoverPicker(true)} className="text-sky hover:underline">Change</button>
                    <button type="button" onClick={() => { setCover(null); setDirty(true); }} className="text-red-700 hover:underline">Remove</button>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" disabled={readOnly} onClick={() => setCoverPicker(true)} className="grid aspect-[16/9] w-full place-items-center rounded-lg border-2 border-dashed border-[#D0D5DD] text-sm font-semibold text-road hover:border-sky hover:text-sky">
                + Add cover image
              </button>
            )}
          </Panel>

          <Panel title="Category and tags">
            <select value={categoryId} disabled={readOnly} onChange={(e) => touch(setCategoryId)(e.target.value)} aria-label="Category" className={input}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {perms.editor && categories.length === 0 && (
              <p className="text-xs text-road">No categories yet. <Link href="/admin/blog/settings" className="font-semibold text-sky hover:underline">Add some</Link>.</p>
            )}
            <input value={tags} disabled={readOnly} onChange={(e) => touch(setTags)(e.target.value)} placeholder="Tags, separated by commas" aria-label="Tags" className={input} />
          </Panel>

          <Panel title="Summary" hint="Shown on the blog list and under the title. Leave empty to use the first lines of the post.">
            <div>
              <textarea value={excerpt} disabled={readOnly} onChange={(e) => touch(setExcerpt)(e.target.value)} maxLength={300} rows={3} aria-label="Summary" className={`${input} h-auto py-2`} />
              <div className="mt-1 text-right"><Counter n={excerpt.length} good={[80, 160]} max={300} /></div>
            </div>
          </Panel>

          <Panel title="Search engines (SEO)">
            <div className="rounded-lg border border-[#EEF0F3] bg-[#FCFCFD] p-3">
              <p className="truncate text-xs text-[#202124]">{url}</p>
              <p className="mt-0.5 line-clamp-1 text-[17px] leading-snug text-[#1A0DAB]">{effectiveSeoTitle}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#4D5156]">{effectiveDesc}</p>
            </div>
            <label className="block text-sm font-medium">
              <span className="flex justify-between">SEO title <Counter n={seoTitle.length} good={[30, 60]} max={70} /></span>
              <input value={seoTitle} disabled={readOnly} onChange={(e) => touch(setSeoTitle)(e.target.value)} maxLength={70} placeholder={title || "Defaults to the post title"} className={`${input} mt-1.5`} />
            </label>
            <label className="block text-sm font-medium">
              <span className="flex justify-between">Meta description <Counter n={seoDescription.length} good={[120, 160]} max={200} /></span>
              <textarea value={seoDescription} disabled={readOnly} onChange={(e) => touch(setSeoDescription)(e.target.value)} maxLength={200} rows={3} placeholder="Defaults to the summary" className={`${input} mt-1.5 h-auto py-2`} />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={noindex} disabled={readOnly} onChange={(e) => touch(setNoindex)(e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky" />
              <span>Hide from Google <span className="block text-xs text-road">Adds “noindex”. Use for thin or temporary posts.</span></span>
            </label>
          </Panel>

          {revisions.length > 0 && (
            <Panel title="Earlier versions" hint="Saved every time the post is saved.">
              <ul className="max-h-60 space-y-1 overflow-y-auto text-sm">
                {revisions.map((r, i) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-road">
                      {new Date(r.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} · {r.editor}
                      {i === 0 && <span className="ml-1 text-xs text-emerald-700">(current)</span>}
                    </span>
                    {i > 0 && !readOnly && (
                      <button type="button" onClick={() => void restore(r.id)} className="shrink-0 text-xs font-semibold text-sky hover:underline">Load</button>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>

      <ImagePicker
        open={coverPicker}
        title="Cover image"
        onClose={() => setCoverPicker(false)}
        onPick={(img) => {
          setCover({ id: img.id, url: img.url });
          if (img.alt) setCoverAlt(img.alt);
          setDirty(true);
        }}
      />
    </div>
  );
}
