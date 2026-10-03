import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/blog-api";
import { saveImage } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Uploads an image (multipart form: "file", "alt"). It's converted to WebP, max 1600px.
 * Use the returned id as a post's coverImageId, or put <img src="/media/<id>" alt="..."> in the content.
 */
export async function POST(req: Request) {
  const caller = await authenticateApiKey(req);
  if (caller instanceof NextResponse) return caller;
  if (Number(req.headers.get("content-length") ?? 0) > 10 * 1024 * 1024 + 64 * 1024) return apiError(413, "Image too large (max 10 MB)");
  const limit = rateLimit(`apikey-upload:${caller.keyId}`, 120, 3_600_000);
  if (!limit.ok) return apiError(429, "Too many uploads this hour");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, "Send multipart/form-data with a \"file\" field");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return apiError(400, "Missing \"file\"");
  const alt = String(form.get("alt") ?? "").replace(/\s+/g, " ").trim();
  if (!alt) return apiError(400, "Every image needs alt text (\"alt\" field)");

  try {
    const saved = await saveImage(file, caller.saver.id, "image", alt);
    await audit(caller.saver.actor ?? caller.saver.email, "media_uploaded", "media", saved.id, { name: saved.fileName });
    return json({ id: saved.id, path: `/media/${saved.id}`, url: `${site.url}/media/${saved.id}`, width: saved.width, height: saved.height, alt: alt.slice(0, 200) }, 201);
  } catch (err) {
    return apiError(400, err instanceof Error ? err.message : "Couldn't read that image");
  }
}
