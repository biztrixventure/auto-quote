import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { apiError, json, postSelect, postView, readJson, resolveCategory, toPostInput } from "@/lib/blog-api";
import { db } from "@/lib/db";
import { savePostAs } from "@/lib/post-save";

export const dynamic = "force-dynamic";

/** Creates a post. Body: { title, content, slug?, excerpt?, category?, tags?, coverImageId?, coverAlt?, seoTitle?, seoDescription?, status?, publishAt? } */
export async function POST(req: Request) {
  const caller = await authenticateApiKey(req);
  if (caller instanceof NextResponse) return caller;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;

  const cat = await resolveCategory(caller, body.category);
  if ("error" in cat) return apiError(400, cat.error);
  const input = toPostInput(body, cat.id);
  if ("error" in input) return apiError(400, input.error);

  const result = await savePostAs(caller.saver, input);
  if (!result.ok) return apiError(400, result.error);
  const post = await db.post.findUniqueOrThrow({ where: { id: result.id }, select: postSelect });
  return json({ message: result.message, post: postView(post) }, 201);
}
