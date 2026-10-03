import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// The IndexNow key file: search engines fetch it to confirm submissions really come from this site.
// Also served at /<key>.txt in the site root, where Bing and Yandex look first (see [key]/route.ts).
export async function GET() {
  const { indexnow } = await getSettings();
  if (!indexnow.enabled || !indexnow.key) return new Response("Not found", { status: 404 });
  return new Response(indexnow.key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
