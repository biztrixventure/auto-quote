import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/blog";
import { apiError, json, readJson } from "@/lib/blog-api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Creates or updates a category (admin keys only). Body: { name, slug?, description? } */
export async function POST(req: Request) {
  const caller = await authenticateApiKey(req);
  if (caller instanceof NextResponse) return caller;
  if (!caller.editor) return apiError(403, "Only an admin key can manage categories");
  const body = await readJson(req, 10_000);
  if (body instanceof NextResponse) return body;

  const name = String(body.name ?? "").replace(/\s+/g, " ").trim().slice(0, 50);
  if (!name) return apiError(400, "Missing \"name\"");
  const slug = slugify(String(body.slug ?? "") || name).slice(0, 60);
  const description = String(body.description ?? "").replace(/\s+/g, " ").trim().slice(0, 300);

  const category = await db.category.upsert({
    where: { slug },
    create: { name, slug, description },
    update: { name, ...(body.description !== undefined ? { description } : {}) },
    select: { id: true, name: true, slug: true, description: true },
  });
  await audit(caller.saver.actor ?? caller.saver.email, "category_updated", "category", category.id, { name });
  return json({ category }, 201);
}
