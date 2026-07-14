import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HeroPortrait } from "./HeroPortrait";

describe("HeroPortrait", () => {
  afterEach(cleanup);

  it("renders the hero's chibi artwork with the aura accent", () => {
    const { container } = render(
      <HeroPortrait heroId="forest-keeper" accent="coral" size="large" />,
    );

    expect(container.firstElementChild).toHaveClass("hero-accent-coral");
    const image = container.querySelector("img");
    expect(image?.getAttribute("src")).toContain("hero-forest-keeper");
  });

  it("stays decorative by default so adjacent text carries the name", () => {
    const { container } = render(<HeroPortrait heroId="wave-scout" />);

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
