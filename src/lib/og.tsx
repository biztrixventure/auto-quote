import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { loadInter } from "./og-font";
import { site } from "./site";

/**
 * Programmatic share images (Open Graph). One template, many pages: each page passes its
 * own variables and gets a unique, branded 1200x630 preview.
 *
 *   {eyebrow}   small label above the title, e.g. "Free quote"
 *   {title}     the headline (required)
 *   {subtitle}  one supporting line
 *   {price}     optional highlight, e.g. "$89/mo"
 *   {priceNote} small text next to the price, e.g. "Average savings"
 *   {image}     optional picture from /public/images or /public/brand, e.g. "/images/cta-car.webp"
 */
export type OgVars = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  price?: string;
  priceNote?: string;
  image?: string;
};

export const OG_SIZE = { width: 1200, height: 630 };
const KEYS = ["eyebrow", "title", "subtitle", "price", "priceNote", "image"] as const;
const LIMITS: Record<(typeof KEYS)[number], number> = { eyebrow: 40, title: 90, subtitle: 140, price: 24, priceNote: 40, image: 120 };
const IMAGE_PATH = /^\/(images|brand)\/[A-Za-z0-9/_-]+\.(png|jpe?g|webp)$/;

// Signing stops strangers from making the server render arbitrary images (CPU abuse).
const SECRET = process.env.OG_SECRET || randomBytes(32).toString("hex");
if (!process.env.OG_SECRET) console.warn("OG_SECRET is not set; share-image links will change after each restart.");

/** Trims every variable to its limit and drops anything not allowed. */
export function cleanOgVars(input: Partial<Record<string, string | null | undefined>>): OgVars {
  const out: Record<string, string> = {};
  for (const k of KEYS) {
    const v = String(input[k] ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITS[k]);
    if (v) out[k] = v;
  }
  if (out.image && (!IMAGE_PATH.test(out.image) || out.image.includes(".."))) delete out.image;
  return { ...out, title: out.title || site.name } as OgVars;
}

function query(vars: OgVars) {
  const p = new URLSearchParams();
  for (const k of KEYS) if (vars[k]) p.set(k, vars[k]!);
  return p.toString();
}

const sign = (qs: string) => createHmac("sha256", SECRET).update(qs).digest("base64url").slice(0, 22);

/** Relative, signed URL for a page's share image. Use it in page metadata. */
export function ogUrl(input: OgVars) {
  const qs = query(cleanOgVars(input));
  return `/api/og?${qs}&sig=${sign(qs)}`;
}

/** Metadata fragment for a page: its own share image on Facebook, LinkedIn, X and others. */
export function ogMetadata(vars: OgVars, extra: { url?: string; title?: string; description?: string } = {}) {
  const url = ogUrl(vars);
  const image = { url, width: OG_SIZE.width, height: OG_SIZE.height, alt: vars.title };
  return {
    openGraph: { ...extra, images: [image] },
    twitter: { card: "summary_large_image" as const, title: extra.title, description: extra.description, images: [url] },
  };
}

/** Checks a request's signature. Returns the cleaned variables, or null when the link wasn't made by this site. */
export function verifyOgRequest(params: URLSearchParams): OgVars | null {
  const vars = cleanOgVars(Object.fromEntries(params));
  const expected = Buffer.from(sign(query(vars)));
  const given = Buffer.from(params.get("sig") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected) ? vars : null;
}

// Converted pictures are kept in memory: the logo appears on every card.
const imageCache = new Map<string, Promise<{ src: string; width: number; height: number } | null>>();

function publicImage(path: string, maxW: number, maxH: number) {
  const key = `${path}|${maxW}|${maxH}`;
  let hit = imageCache.get(key);
  if (!hit) {
    hit = loadPublicImage(path, maxW, maxH);
    imageCache.set(key, hit);
  }
  return hit;
}

async function loadPublicImage(path: string, maxW: number, maxH: number) {
  const root = normalize(join(process.cwd(), "public"));
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) return null;
  try {
    const img = sharp(await readFile(file)).resize({ width: maxW * 2, height: maxH * 2, fit: "inside", withoutEnlargement: true }).png();
    const { data, info } = await img.toBuffer({ resolveWithObject: true });
    const scale = Math.min(maxW / info.width, maxH / info.height, 1);
    return { src: `data:image/png;base64,${data.toString("base64")}`, width: Math.round(info.width * scale), height: Math.round(info.height * scale) };
  } catch {
    return null;
  }
}

/** Renders the branded template with the given variables. */
export async function renderOg(input: OgVars) {
  const v = cleanOgVars(input);
  const [logo, picture, mark, fonts] = await Promise.all([
    publicImage("/brand/logo.png", 360, 84),
    v.image ? publicImage(v.image, 440, 380) : Promise.resolve(null),
    v.image ? Promise.resolve(null) : publicImage("/brand/logo-mark.png", 620, 420),
    // The eyebrow is shown in capitals, so its uppercase letters are needed too.
    loadInter([400, 700, 800], `${KEYS.map((k) => v[k] ?? "").join("")}${(v.eyebrow ?? "").toUpperCase()}${site.name}`),
  ]);
  // Long titles, or a price badge underneath, need a smaller headline to keep clear of the logo.
  const titleSize = Math.min(v.title.length > 60 ? 56 : v.title.length > 40 ? 66 : 76, v.price ? 60 : 76);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#FFFFFF", fontFamily: "Inter" }}>
        {mark && <img src={mark.src} width={mark.width} height={mark.height} style={{ position: "absolute", right: -80, bottom: 40, opacity: 0.08 }} />}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 64px 84px", width: picture ? 720 : "100%" }}>
          {logo ? <img src={logo.src} width={logo.width} height={logo.height} /> : <div style={{ fontSize: 36, fontWeight: 800 }}>{site.name}</div>}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {v.eyebrow && (
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#1F5FAD", marginBottom: 14 }}>{v.eyebrow}</div>
            )}
            <div style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: "#16181C" }}>{v.title}</div>
            {v.subtitle && <div style={{ marginTop: 20, fontSize: 28, lineHeight: 1.35, color: "#4A515C" }}>{v.subtitle}</div>}
            {v.price && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
                <div style={{ display: "flex", background: "#F2C230", color: "#16181C", borderRadius: 14, padding: "10px 22px", fontSize: 40, fontWeight: 800 }}>{v.price}</div>
                {v.priceNote && <div style={{ fontSize: 24, color: "#4A515C" }}>{v.priceNote}</div>}
              </div>
            )}
          </div>
        </div>
        {picture && (
          <div style={{ position: "absolute", right: 48, top: 0, bottom: 18, width: 440, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={picture.src} width={picture.width} height={picture.height} />
          </div>
        )}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 18, display: "flex", background: "linear-gradient(90deg, #FFC400 0%, #FF7A00 100%)" }} />
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
