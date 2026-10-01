import { NextRequest, NextResponse } from "next/server";
import { requireBlogAccess } from "@/lib/admin-guard";
import { MAX_UPLOAD_BYTES, saveImage } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Image upload for the blog editor, cover images and author photos.
export async function POST(req: NextRequest) {
  const me = await requireBlogAccess();
  const headers = { "Cache-Control": "no-store" };

  // Only from this site's own pages.
  const origin = req.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "Not allowed" }, { status: 403, headers });
  } catch {
    return NextResponse.json({ error: "Not allowed" }, { status: 403, headers });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Images can be up to 10 MB." }, { status: 413, headers });
  }
  if (!rateLimit(`upload:${me.id}`, 120, 3600_000).ok) {
    return NextResponse.json({ error: "Too many uploads. Try again in a while." }, { status: 429, headers });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400, headers });
  const kind = form?.get("kind") === "avatar" ? "avatar" : "image";
  const alt = String(form?.get("alt") ?? "");

  try {
    const m = await saveImage(file, me.id, kind, alt);
    return NextResponse.json({ id: m.id, url: `/media/${m.id}`, width: m.width, height: m.height }, { headers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400, headers });
  }
}
