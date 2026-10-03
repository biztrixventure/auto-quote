import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { apiError, json, postSelect, postView, readJson, resolveCategory, toPostInput } from "@/lib/blog-api";
import { db } from "@/lib/db";
import { postAccess, savePostAs } from "@/lib/post-save";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function load(idOrSlug: string) {
  return db.post.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, select: postSelect });
}

/** One post by id or slug, with its full HTML. */
export async function GET(req: Request, { params }: Ctx) {
  const caller = await authenticateApiKey(req);
  if (caller instanceof NextResponse) return caller;
  const post = await load((await params).id);
  if (!post) return apiError(404, "Post not found");
  if (!caller.editor && post.authorId !== caller.saver.id) return apiError(403, "This key can only read its own posts");
  return json({ post: postView(post) });
}

/** Updates a post. Only the fields you send change. Add "status": "publish" to publish. */
export async function PATCH(req: Request, { params }: Ctx) {
  const caller = await authenticateApiKey(req);
  if (caller instanceof NextResponse) return caller;
  const existing = await load((await params).id);
  if (!existing) return apiError(404, "Post not found");
  const can = await postAccess(caller.saver, existing);
  if (!can.canEdit) return apiError(403, "This key can't change this post");

  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  let categoryId: string | null | undefined;
  if (body.category !== undefined) {
    const cat = await resolveCategory(caller, body.category);
    if ("error" in cat) return apiError(400, cat.error);
    categoryId = cat.id;
  }
  const input = toPostInput(body, categoryId, existing);
  if ("error" in input) return apiError(400, input.error);

  const result = await savePostAs(caller.saver, input);
  if (!result.ok) return apiError(400, result.error);
  const post = await db.post.findUniqueOrThrow({ where: { id: result.id }, select: postSelect });
  return json({ message: result.message, post: postView(post) });
}
