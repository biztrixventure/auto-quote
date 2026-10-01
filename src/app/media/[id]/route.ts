import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Serves uploaded images. An image never changes once uploaded (a new upload gets a new id),
// so browsers and CDNs may keep it for a year.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^c[a-z0-9]{20,32}$/.test(id)) return new NextResponse(null, { status: 404 });
  const etag = `"${id}"`;
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });

  const m = await db.media.findUnique({ where: { id }, select: { mime: true, data: true, size: true } });
  if (!m) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(new Uint8Array(m.data), {
    headers: {
      "Content-Type": m.mime,
      "Content-Length": String(m.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
