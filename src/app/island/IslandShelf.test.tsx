import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IslandShelf } from "./IslandShelf";

afterEach(cleanup);

describe("IslandShelf", () => {
  it("尚未收藏任何能力卡時顯示鼓勵文案", () => {
    render(<IslandShelf collectedMicroSkills={[]} />);

    expect(screen.getByText(/完成第一個任務，第一張能力卡就會擺上這座展示架/)).toBeInTheDocument();
  });

  it("已收藏的能力卡會列在展示架上", () => {
    render(<IslandShelf collectedMicroSkills={["cvc-decoding", "yes-no-questions"]} />);

    const shelf = screen.getByRole("list", { name: "已收藏的能力卡" });
    expect(shelf).toBeInTheDocument();
    expect(screen.getByText("CVC 拼讀")).toBeInTheDocument();
    expect(screen.getByText("Yes／No 問答")).toBeInTheDocument();
  });

  it("提供前往完整圖鑑的連結", () => {
    render(<IslandShelf collectedMicroSkills={[]} />);

    expect(screen.getByRole("link", { name: "查看完整圖鑑" })).toHaveAttribute("href", "/dex");
  });
});
