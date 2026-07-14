import Image from "next/image";
import type { HeroAccent, HeroId } from "@/infrastructure/progress/progress-types";

const PORTRAIT_SRC: Readonly<Record<HeroId, string>> = {
  "wave-scout": "/art/hero-wave-scout-bust.jpg",
  "forest-keeper": "/art/hero-forest-keeper-bust.jpg",
  "star-smith": "/art/hero-star-smith-bust.jpg",
};

const PORTRAIT_PX = { small: 56, medium: 88, large: 132 } as const;

export function HeroPortrait({
  heroId,
  accent,
  size = "medium",
  alt = "",
}: {
  heroId: HeroId;
  accent?: HeroAccent;
  size?: "small" | "medium" | "large";
  alt?: string;
}) {
  const px = PORTRAIT_PX[size];
  return (
    <span
      className={`hero-portrait hero-portrait-${size}${accent ? ` hero-accent-${accent}` : ""}`}
    >
      <Image src={PORTRAIT_SRC[heroId]} alt={alt} width={px} height={px} />
    </span>
  );
}
