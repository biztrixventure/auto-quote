import sharp from "sharp";
import { db } from "./db";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "avif", "gif", "tiff", "heif"]);

export type UploadKind = "image" | "avatar";

/**
 * Checks an uploaded image by its real contents (not its name), fixes rotation, resizes it
 * and stores it as WebP. Photos and graphics come out a fraction of their original size.
 */
export async function saveImage(file: File, uploaderId: string, kind: UploadKind = "image", alt = "") {
  if (file.size === 0) throw new Error("The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Images can be up to 10 MB.");
  const input = Buffer.from(await file.arrayBuffer());

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new Error("That file isn't an image we can read. Use JPG, PNG, WebP or AVIF.");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new Error("Use a JPG, PNG, WebP or AVIF image.");
  if ((meta.width ?? 0) * (meta.height ?? 0) > 60_000_000) throw new Error("That image is too large (over 60 megapixels).");

  let pipeline = sharp(input, { animated: false }).rotate();
  pipeline =
    kind === "avatar"
      ? pipeline.resize(320, 320, { fit: "cover", position: "attention" })
      : pipeline.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
  const { data, info } = await pipeline.webp({ quality: 80, effort: 4 }).toBuffer({ resolveWithObject: true });

  const base = (file.name || "image").replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-").slice(0, 80) || "image";
  return db.media.create({
    data: { uploaderId, fileName: `${base}.webp`, mime: "image/webp", width: info.width, height: info.height, size: data.length, alt: alt.slice(0, 200), data: new Uint8Array(data) },
    select: { id: true, width: true, height: true, fileName: true, size: true },
  });
}
