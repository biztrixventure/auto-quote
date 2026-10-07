import { OG_SIZE, renderOg } from "@/lib/og";
import { site } from "@/lib/site";

// Homepage share card, built from the shared template in src/lib/og.tsx.
export const alt = `${site.name}: extended car warranty plans`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOg({
    title: "Protect your budget from costly car repairs.",
    subtitle: "Two separate products · Free quotes · No obligation",
  });
}
