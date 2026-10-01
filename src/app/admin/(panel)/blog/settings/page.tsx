import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Checkbox, FormField, Notice, SectionFooter, inputCls } from "@/components/admin/forms";
import { Card, PageHeader, btnPrimary } from "@/components/admin/ui";
import { deleteCategory, saveBlogSettings, saveCategory } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog settings" };

export default async function BlogSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin("admin");
  const [sp, { blog }, categories] = await Promise.all([
    searchParams,
    getSettings(),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { posts: true } } } }),
  ]);

  return (
    <>
      <PageHeader title="Categories & settings" subtitle="Organise the blog and choose how writers publish." />
      <Notice saved={sp.saved} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Categories">
          <p className="mb-4 text-sm text-road">Each category gets its own page, e.g. /blog/category/car-insurance. Lower numbers show first.</p>
          <ul className="space-y-3">
            {categories.map((c) => (
              <li key={c.id} className="rounded-lg border border-[#EEF0F3] p-3">
                <form action={saveCategory} className="grid gap-2 sm:grid-cols-[1fr_1fr_70px]">
                  <input type="hidden" name="id" value={c.id} />
                  <input name="name" defaultValue={c.name} maxLength={50} aria-label="Category name" className={inputCls} />
                  <input name="slug" defaultValue={c.slug} maxLength={60} aria-label="Category address" className={inputCls} />
                  <input name="sortOrder" type="number" defaultValue={c.sortOrder} aria-label="Order" className={inputCls} />
                  <input name="description" defaultValue={c.description} maxLength={300} placeholder="Short description (shown on the category page)" aria-label="Description" className={`${inputCls} sm:col-span-3`} />
                  <div className="flex items-center justify-between sm:col-span-3">
                    <span className="text-xs text-road">{c._count.posts} post{c._count.posts === 1 ? "" : "s"}</span>
                    <span className="flex gap-2">
                      <button className="rounded-lg border border-[#D0D5DD] px-3 py-1.5 text-xs font-semibold hover:bg-[#F9FAFB]">Save</button>
                      <button formAction={deleteCategory} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button>
                    </span>
                  </div>
                </form>
              </li>
            ))}
          </ul>
          <form action={saveCategory} className="mt-4 grid gap-2 border-t border-[#EEF0F3] pt-4 sm:grid-cols-[1fr_1fr_auto]">
            <input name="name" required maxLength={50} placeholder="New category, e.g. Car insurance" aria-label="New category name" className={inputCls} />
            <input name="description" maxLength={300} placeholder="Description (optional)" aria-label="New category description" className={inputCls} />
            <button className={btnPrimary}>Add</button>
          </form>
        </Card>

        <Card title="Blog settings">
          <form action={saveBlogSettings} className="space-y-4">
            <FormField label="Blog title" htmlFor="title" hint="Type {company} to insert your business name.">
              <input id="title" name="title" defaultValue={blog.title} maxLength={80} className={inputCls} />
            </FormField>
            <FormField label="Intro" htmlFor="intro" hint="One or two sentences under the title on /blog.">
              <textarea id="intro" name="intro" defaultValue={blog.intro} maxLength={300} rows={2} className={`${inputCls} h-auto py-2`} />
            </FormField>
            <FormField label="Posts per page" htmlFor="postsPerPage">
              <input id="postsPerPage" name="postsPerPage" type="number" min={3} max={30} defaultValue={blog.postsPerPage} className={`${inputCls} max-w-[120px]`} />
            </FormField>
            <Checkbox name="writersCanPublish" defaultChecked={blog.writersCanPublish} label="Blog writers can publish without review" hint="Off: writers send posts for review and an admin publishes them (recommended)." />
            <Checkbox name="showQuoteCta" defaultChecked={blog.showQuoteCta} label="Show a quote box in every post" hint="Turns readers into leads: a short pitch with a button to the quote form." />
            <FormField label="Quote box title" htmlFor="ctaTitle">
              <input id="ctaTitle" name="ctaTitle" defaultValue={blog.ctaTitle} maxLength={80} className={inputCls} />
            </FormField>
            <FormField label="Quote box text" htmlFor="ctaText">
              <textarea id="ctaText" name="ctaText" defaultValue={blog.ctaText} maxLength={240} rows={2} className={`${inputCls} h-auto py-2`} />
            </FormField>
            <SectionFooter><button className={btnPrimary}>Save settings</button></SectionFooter>
          </form>
        </Card>
      </div>
    </>
  );
}
