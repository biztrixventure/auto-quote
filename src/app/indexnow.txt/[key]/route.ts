import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// /<key>.txt in the site root is rewritten here (next.config.mjs). Answers only when the name
// is the real IndexNow key, so guessing names reveals nothing.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { indexnow } = await getSettings();
  if (!indexnow.enabled || !indexnow.key || key !== indexnow.key) return new Response("Not found", { status: 404 });
  return new Response(indexnow.key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
