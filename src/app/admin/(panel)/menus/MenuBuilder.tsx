"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LinkGroup } from "@/lib/menus";
import type { FooterColumn, MenuItem, NavigationSettings } from "@/lib/settings";
import { saveMenus } from "./actions";

const LIMITS = { topItems: 10, children: 12, footerColumns: 4, footerLinks: 12 }; // keep in sync with src/lib/menus.ts
const input = "block h-9 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-road/45 focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15";
const newId = () => Math.random().toString(36).slice(2, 10);
const swap = <T,>(arr: T[], i: number, j: number) => {
  if (j < 0 || j >= arr.length) return arr;
  const a = [...arr];
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};

function Card({ title, hint, action, children }: { title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-[#EEF0F3] px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-road">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const IconBtn = ({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) => (
  <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-md text-road transition hover:bg-[#F2F4F7] hover:text-asphalt disabled:opacity-30 disabled:hover:bg-transparent">
    {children}
  </button>
);
const Ico = (d: string) => <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

/** Pick a page from the site, or type any address. */
function LinkInput({ value, onChange, options, id }: { value: string; onChange: (href: string, label?: string) => void; options: LinkGroup[]; id?: string }) {
  const known = options.some((g) => g.items.some((i) => i.href === value));
  const [custom, setCustom] = useState(!known && value !== "");
  return (
    <div className="space-y-2">
      <select
        id={id}
        value={custom ? "__custom" : known ? value : ""}
        onChange={(e) => {
          if (e.target.value === "__custom") return setCustom(true);
          setCustom(false);
          const opt = options.flatMap((g) => g.items).find((i) => i.href === e.target.value);
          onChange(e.target.value, opt?.label.replace(/ \(draft\)$/, ""));
        }}
        className={input}
      >
        <option value="" disabled>Choose a page…</option>
        {options.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((i) => <option key={i.href} value={i.href}>{i.label}</option>)}
          </optgroup>
        ))}
        <option value="__custom">Custom address…</option>
      </select>
      {custom && <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/page-address or https://…" aria-label="Custom address" className={input} />}
    </div>
  );
}

function ItemEditor({ item, onChange, options, showDescription }: { item: MenuItem; onChange: (i: MenuItem) => void; options: LinkGroup[]; showDescription: boolean }) {
  return (
    <div className="grid gap-3 border-t border-[#EEF0F3] bg-[#FCFCFD] p-3 sm:grid-cols-2">
      <label className="block text-xs font-semibold text-road">
        Label
        <input value={item.label} maxLength={40} onChange={(e) => onChange({ ...item, label: e.target.value })} className={`${input} mt-1`} />
      </label>
      <div className="text-xs font-semibold text-road">
        Link to
        <div className="mt-1">
          <LinkInput value={item.href} options={options} onChange={(href, label) => onChange({ ...item, href, label: item.label || label || "" })} />
        </div>
      </div>
      {showDescription && (
        <label className="block text-xs font-semibold text-road sm:col-span-2">
          Short description <span className="font-normal">(optional, shown under the link in the dropdown)</span>
          <input value={item.description ?? ""} maxLength={120} onChange={(e) => onChange({ ...item, description: e.target.value })} placeholder="e.g. What your plan covers and costs" className={`${input} mt-1`} />
        </label>
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={!!item.newTab} onChange={(e) => onChange({ ...item, newTab: e.target.checked })} className="h-4 w-4 accent-sky" />
        Open in a new tab <span className="text-xs text-road">(use for other websites only)</span>
      </label>
    </div>
  );
}

type RowProps = {
  item: MenuItem;
  child?: boolean;
  first: boolean;
  last: boolean;
  options: LinkGroup[];
  open: boolean;
  onToggle: () => void;
  onChange: (i: MenuItem) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onIndent?: () => void;
  onOutdent?: () => void;
};

function Row({ item, child, first, last, options, open, onToggle, onChange, onUp, onDown, onRemove, onIndent, onOutdent }: RowProps) {
  return (
    <div className={`overflow-hidden rounded-lg border bg-white ${open ? "border-sky ring-4 ring-sky/10" : "border-[#E4E7EC]"}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span aria-hidden className="text-road/40">{Ico("M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01")}</span>
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-semibold text-asphalt">{item.label || <span className="text-red-600">No label</span>}</span>
          <span className="block truncate text-xs text-road">{item.href}{item.newTab ? " · new tab" : ""}</span>
        </button>
        <div className="flex shrink-0 items-center">
          <IconBtn label="Move up" onClick={onUp} disabled={first}>{Ico("m18 15-6-6-6 6")}</IconBtn>
          <IconBtn label="Move down" onClick={onDown} disabled={last}>{Ico("m6 9 6 6 6-6")}</IconBtn>
          {onIndent && <IconBtn label="Put inside the item above (dropdown)" onClick={onIndent} disabled={first}>{Ico("M3 6h18M9 12h12M9 18h12M3 10l3 2-3 2")}</IconBtn>}
          {onOutdent && <IconBtn label="Move out of the dropdown" onClick={onOutdent}>{Ico("M3 6h18M9 12h12M9 18h12M6 10l-3 2 3 2")}</IconBtn>}
          <IconBtn label={open ? "Close" : "Edit"} onClick={onToggle}>{Ico(open ? "m18 15-6-6-6 6" : "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z")}</IconBtn>
          <IconBtn label="Remove" onClick={onRemove}>{Ico("M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6")}</IconBtn>
        </div>
      </div>
      {open && <ItemEditor item={item} onChange={onChange} options={options} showDescription={!!child} />}
    </div>
  );
}

function AddLink({ options, onAdd, disabled, label = "Add link" }: { options: LinkGroup[]; onAdd: (i: MenuItem) => void; disabled?: boolean; label?: string }) {
  const [href, setHref] = useState("");
  const [text, setText] = useState("");
  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-dashed border-[#D0D5DD] p-3 sm:grid-cols-[1.3fr_1fr_auto]">
      <LinkInput value={href} options={options} onChange={(h, l) => { setHref(h); if (l) setText(l); }} />
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={40} placeholder="Label" aria-label="Label" className={input} />
      <button
        type="button"
        disabled={disabled || !href || !text.trim()}
        onClick={() => {
          onAdd({ id: newId(), label: text.trim(), href: href.trim() });
          setHref("");
          setText("");
        }}
        className="h-9 rounded-lg bg-asphalt px-3 text-sm font-semibold text-white hover:bg-road disabled:opacity-40"
      >
        + {label}
      </button>
    </div>
  );
}

export function MenuBuilder({ initial, options }: { initial: NavigationSettings; options: LinkGroup[] }) {
  const [nav, setNav] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (fn: (n: NavigationSettings) => NavigationSettings) => {
    setNav(fn);
    setDirty(true);
    setNotice(null);
  };
  const setLinks = (fn: (l: MenuItem[]) => MenuItem[]) => update((n) => ({ ...n, links: fn(n.links) }));
  const setColumns = (fn: (c: FooterColumn[]) => FooterColumn[]) => update((n) => ({ ...n, footerColumns: fn(n.footerColumns) }));
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const r = await saveMenus(nav);
      if (r.ok) {
        setDirty(false);
        setNotice({ ok: true, text: "Menus saved. They're live on the website." });
      } else setNotice({ ok: false, text: r.error ?? "Couldn't save." });
    } catch {
      setNotice({ ok: false, text: "Couldn't save. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  // Header tree operations (one level of dropdowns)
  const indent = (i: number) =>
    setLinks((links) => {
      const prev = links[i - 1];
      const item = links[i];
      if (!prev || item.children?.length) return links;
      const next = links.filter((_, j) => j !== i);
      next[i - 1] = { ...prev, children: [...(prev.children ?? []), { ...item, children: undefined }] };
      return next;
    });
  const outdent = (pi: number, ci: number) =>
    setLinks((links) => {
      const parent = links[pi];
      const item = parent.children![ci];
      const next = [...links];
      next[pi] = { ...parent, children: parent.children!.filter((_, j) => j !== ci) };
      next.splice(pi + 1, 0, item);
      return next;
    });

  const anyDescription = nav.links.some((l) => l.children?.some((c) => c.description));

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-[#E4E7EC] bg-[#F6F7F9]/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <span className="text-sm text-road">{saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}</span>
        <div className="ml-auto flex gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">View site ↗</a>
          <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="rounded-lg bg-asphalt px-4 py-2 text-sm font-semibold text-white hover:bg-road disabled:opacity-50">
            {saving ? "Saving…" : "Save menus"}
          </button>
        </div>
      </div>
      {notice && (
        <div role={notice.ok ? "status" : "alert"} className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {notice.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Card
            title="Header menu"
            hint={<>Use <strong>↑ ↓</strong> to reorder. Use <strong>→</strong> to put a link inside the one above it: that makes a dropdown (submenu).</>}
            action={<span className="text-xs text-road">{nav.links.length}/{LIMITS.topItems}</span>}
          >
            {nav.links.length === 0 && <p className="rounded-lg bg-[#F9FAFB] px-4 py-6 text-center text-sm text-road">No links yet. Add your first one below.</p>}
            <ol className="space-y-2">
              {nav.links.map((item, i) => (
                <li key={item.id}>
                  <Row
                    item={item}
                    first={i === 0}
                    last={i === nav.links.length - 1}
                    options={options}
                    open={open === item.id}
                    onToggle={() => toggle(item.id)}
                    onChange={(it) => setLinks((l) => l.map((x, j) => (j === i ? it : x)))}
                    onUp={() => setLinks((l) => swap(l, i, i - 1))}
                    onDown={() => setLinks((l) => swap(l, i, i + 1))}
                    onRemove={() => {
                      if (item.children?.length && !window.confirm(`Remove “${item.label}” and the ${item.children.length} link(s) in its dropdown?`)) return;
                      setLinks((l) => l.filter((_, j) => j !== i));
                    }}
                    onIndent={item.children?.length ? undefined : () => indent(i)}
                  />
                  {!!item.children?.length && (
                    <ol className="ml-6 mt-2 space-y-2 border-l-2 border-[#E4E7EC] pl-4">
                      <li className="text-xs font-semibold uppercase tracking-wide text-road">Dropdown under “{item.label}”</li>
                      {item.children.map((c, ci) => (
                        <li key={c.id}>
                          <Row
                            item={c}
                            child
                            first={ci === 0}
                            last={ci === item.children!.length - 1}
                            options={options}
                            open={open === c.id}
                            onToggle={() => toggle(c.id)}
                            onChange={(it) => setLinks((l) => l.map((x, j) => (j === i ? { ...x, children: x.children!.map((y, k) => (k === ci ? it : y)) } : x)))}
                            onUp={() => setLinks((l) => l.map((x, j) => (j === i ? { ...x, children: swap(x.children!, ci, ci - 1) } : x)))}
                            onDown={() => setLinks((l) => l.map((x, j) => (j === i ? { ...x, children: swap(x.children!, ci, ci + 1) } : x)))}
                            onRemove={() => setLinks((l) => l.map((x, j) => (j === i ? { ...x, children: x.children!.filter((_, k) => k !== ci) } : x)))}
                            onOutdent={() => outdent(i, ci)}
                          />
                        </li>
                      ))}
                      <li>
                        <AddLink options={options} label="Add to dropdown" disabled={item.children.length >= LIMITS.children} onAdd={(it) => setLinks((l) => l.map((x, j) => (j === i ? { ...x, children: [...x.children!, it] } : x)))} />
                      </li>
                    </ol>
                  )}
                </li>
              ))}
            </ol>
            <AddLink options={options} disabled={nav.links.length >= LIMITS.topItems} onAdd={(it) => setLinks((l) => [...l, it])} />
            <p className="mt-3 text-xs text-road">Tip: keep 4–7 top links. A link that has a dropdown still opens its own page when clicked, so give it a real page too.</p>
          </Card>

          <Card
            title="Footer menus"
            hint="Columns of links at the bottom of every page. Your phone and email are added automatically."
            action={
              <button type="button" disabled={nav.footerColumns.length >= LIMITS.footerColumns} onClick={() => setColumns((c) => [...c, { id: newId(), title: "New column", links: [] }])} className="text-sm font-semibold text-sky hover:underline disabled:opacity-40">
                + Add column
              </button>
            }
          >
            <div className="grid gap-5 lg:grid-cols-2">
              {nav.footerColumns.map((col, ci) => (
                <div key={col.id} className="rounded-xl border border-[#EEF0F3] p-3">
                  <div className="flex items-center gap-1">
                    <input value={col.title} maxLength={40} onChange={(e) => setColumns((c) => c.map((x, j) => (j === ci ? { ...x, title: e.target.value } : x)))} aria-label="Column title" className={`${input} font-semibold`} />
                    <IconBtn label="Move column left" onClick={() => setColumns((c) => swap(c, ci, ci - 1))} disabled={ci === 0}>{Ico("m15 18-6-6 6-6")}</IconBtn>
                    <IconBtn label="Move column right" onClick={() => setColumns((c) => swap(c, ci, ci + 1))} disabled={ci === nav.footerColumns.length - 1}>{Ico("m9 18 6-6-6-6")}</IconBtn>
                    <IconBtn label="Remove column" onClick={() => window.confirm(`Remove the “${col.title}” column?`) && setColumns((c) => c.filter((_, j) => j !== ci))}>{Ico("M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6")}</IconBtn>
                  </div>
                  <ol className="mt-3 space-y-2">
                    {col.links.map((l, li) => (
                      <li key={l.id}>
                        <Row
                          item={l}
                          first={li === 0}
                          last={li === col.links.length - 1}
                          options={options}
                          open={open === l.id}
                          onToggle={() => toggle(l.id)}
                          onChange={(it) => setColumns((c) => c.map((x, j) => (j === ci ? { ...x, links: x.links.map((y, k) => (k === li ? it : y)) } : x)))}
                          onUp={() => setColumns((c) => c.map((x, j) => (j === ci ? { ...x, links: swap(x.links, li, li - 1) } : x)))}
                          onDown={() => setColumns((c) => c.map((x, j) => (j === ci ? { ...x, links: swap(x.links, li, li + 1) } : x)))}
                          onRemove={() => setColumns((c) => c.map((x, j) => (j === ci ? { ...x, links: x.links.filter((_, k) => k !== li) } : x)))}
                        />
                      </li>
                    ))}
                  </ol>
                  <AddLink options={options} disabled={col.links.length >= LIMITS.footerLinks} onAdd={(it) => setColumns((c) => c.map((x, j) => (j === ci ? { ...x, links: [...x.links, it] } : x)))} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Header options">
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Button text <span className="font-normal text-road">(empty = no button)</span>
                <input value={nav.ctaLabel} maxLength={30} onChange={(e) => update((n) => ({ ...n, ctaLabel: e.target.value }))} className={`${input} mt-1.5`} />
              </label>
              <div className="text-sm font-medium">
                Button link
                <div className="mt-1.5"><LinkInput value={nav.ctaHref} options={options} onChange={(h) => update((n) => ({ ...n, ctaHref: h }))} /></div>
              </div>
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <input type="checkbox" checked={nav.showPhone} onChange={(e) => update((n) => ({ ...n, showPhone: e.target.checked }))} className="h-4 w-4 accent-sky" />
                Show phone number
              </label>
              <label className="flex items-start gap-2.5 text-sm font-medium">
                <input type="checkbox" checked={nav.sticky} onChange={(e) => update((n) => ({ ...n, sticky: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-sky" />
                <span>Keep the header at the top while scrolling <span className="block text-xs font-normal text-road">The quote button stays in view, which brings more leads.</span></span>
              </label>
            </div>
          </Card>

          <Card title="Announcement bar" hint="A thin bar above the header for offers or news.">
            <div className="space-y-4">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <input type="checkbox" checked={nav.announcement.enabled} onChange={(e) => update((n) => ({ ...n, announcement: { ...n.announcement, enabled: e.target.checked } }))} className="h-4 w-4 accent-sky" />
                Show the announcement bar
              </label>
              <label className="block text-sm font-medium">
                Text
                <input value={nav.announcement.text} maxLength={160} onChange={(e) => update((n) => ({ ...n, announcement: { ...n.announcement, text: e.target.value } }))} placeholder="e.g. Save up to 20% when you switch this month" className={`${input} mt-1.5`} />
              </label>
              <label className="block text-sm font-medium">
                Link text <span className="font-normal text-road">(optional)</span>
                <input value={nav.announcement.linkLabel} maxLength={30} onChange={(e) => update((n) => ({ ...n, announcement: { ...n.announcement, linkLabel: e.target.value } }))} placeholder="Get a quote" className={`${input} mt-1.5`} />
              </label>
              <div className="text-sm font-medium">
                Link
                <div className="mt-1.5"><LinkInput value={nav.announcement.href} options={options} onChange={(h) => update((n) => ({ ...n, announcement: { ...n.announcement, href: h } }))} /></div>
              </div>
            </div>
          </Card>

          <Card title="Preview">
            <div className="overflow-hidden rounded-lg border border-[#E4E7EC] text-xs">
              {nav.announcement.enabled && nav.announcement.text && <div className="truncate bg-asphalt px-3 py-1.5 text-center text-white">{nav.announcement.text} {nav.announcement.linkLabel && <u>{nav.announcement.linkLabel}</u>}</div>}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <span className="font-extrabold">VERTEX</span>
                {nav.links.map((l) => (
                  <span key={l.id} className="font-semibold">{l.label}{l.children?.length ? " ▾" : ""}</span>
                ))}
                {nav.ctaLabel && <span className="ml-auto rounded bg-line px-2 py-1 font-bold">{nav.ctaLabel}</span>}
              </div>
            </div>
            {anyDescription && <p className="mt-2 text-xs text-road">Dropdowns with descriptions open as a wider panel.</p>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
