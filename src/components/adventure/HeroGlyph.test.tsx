import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroGlyph } from "./HeroGlyph";

describe("HeroGlyph", () => {
  it("applies the student's chosen aura accent", () => {
    const { container } = render(
      <HeroGlyph heroId="wave-scout" accent="coral" size="large" />,
    );

    expect(container.firstElementChild).toHaveClass("hero-accent-coral");
  });
});
