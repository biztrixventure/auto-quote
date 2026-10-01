// Loads Inter for generated images (share previews). Satori can't read woff2, so the CSS
// request uses an old user agent to get a TTF; `text` limits the font to the glyphs used. Returns [] on failure so images still render.
type Font = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" };
// Fonts for the same text are reused instead of downloaded again for every image.
const cache = new Map<string, Promise<Font[]>>();

export function loadInter(weights: (400 | 700 | 800)[], text: string): Promise<Font[]> {
  const glyphs = [...new Set(text)].sort().join("");
  const key = `${weights.join(",")}|${glyphs}`;
  let hit = cache.get(key);
  if (!hit) {
    if (cache.size > 300) cache.clear();
    hit = fetchInter(weights, glyphs).then((fonts) => {
      if (fonts.length === 0) cache.delete(key); // don't keep a failed download
      return fonts;
    });
    cache.set(key, hit);
  }
  return hit;
}

async function fetchInter(weights: (400 | 700 | 800)[], text: string): Promise<Font[]> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weights.join(";")}&text=${encodeURIComponent(text)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.30 (KHTML, like Gecko) Safari/534.30" },
    }).then((r) => r.text());
    const urls = [...css.matchAll(/font-weight:\s*(\d+);[^}]*?src:\s*url\(([^)]+)\)/g)];
    return await Promise.all(
      urls.map(async ([, weight, url]) => ({
        name: "Inter",
        data: await fetch(url).then((r) => r.arrayBuffer()),
        weight: Number(weight) as 400 | 700 | 800,
        style: "normal" as const,
      })),
    );
  } catch {
    return [];
  }
}
