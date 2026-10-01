import { OG_SIZE, renderOg } from "@/lib/og";
import { site } from "@/lib/site";

// Homepage share card, built from the shared template in src/lib/og.tsx.
export const alt = `${site.name}: compare car insurance quotes`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOg({
    title: "Compare car insurance quotes in minutes.",
    subtitle: "One quick form · Free to compare · Licensed agents in all 50 states",
  });
}
