import { Leaf, Sparkles, Waves } from "lucide-react";
import type { HeroId } from "@/infrastructure/progress/progress-types";

export function HeroGlyph({ heroId, size = "medium" }: { heroId: HeroId; size?: "small" | "medium" | "large" }) {
  const Icon = heroId === "wave-scout" ? Waves : heroId === "forest-keeper" ? Leaf : Sparkles;
  return (
    <span className={`hero-glyph hero-${heroId} hero-glyph-${size}`} aria-hidden="true">
      <Icon />
    </span>
  );
}
