import { Leaf, Sparkles, Waves } from "lucide-react";
import type { HeroAccent, HeroId } from "@/infrastructure/progress/progress-types";

export function HeroGlyph({
  heroId,
  accent = "ocean",
  size = "medium",
}: {
  heroId: HeroId;
  accent?: HeroAccent;
  size?: "small" | "medium" | "large";
}) {
  const Icon = heroId === "wave-scout" ? Waves : heroId === "forest-keeper" ? Leaf : Sparkles;
  return (
    <span
      className={`hero-glyph hero-${heroId} hero-accent-${accent} hero-glyph-${size}`}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}
