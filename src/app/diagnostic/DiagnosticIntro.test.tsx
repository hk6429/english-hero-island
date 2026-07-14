import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DiagnosticEmptyState, DiagnosticIntro } from "./DiagnosticIntro";

afterEach(cleanup);

describe("DiagnosticIntro", () => {
  it("以標題與導語說明這是找起點，不是考試", () => {
    render(<DiagnosticIntro />);

    expect(
      screen.getByRole("heading", { level: 1, name: "五題就好，先看看哪條路最適合你。" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/亮出最適合你的第一個任務/)).toBeInTheDocument();
  });

  it("列出三條安心約定，涵蓋不是考試、不扣進度、線索可用", () => {
    render(<DiagnosticIntro />);

    const list = screen.getByRole("list", { name: "安心約定" });
    const items = screen.getAllByRole("listitem");
    expect(list).toBeInTheDocument();
    expect(items).toHaveLength(3);
    expect(screen.getByText(/不是考試/)).toBeInTheDocument();
    expect(screen.getByText(/不會扣掉已完成的進度/)).toBeInTheDocument();
    expect(screen.getByText(/換一個線索再試/)).toBeInTheDocument();
  });

  it("文案不出現對孩子的否定字眼", () => {
    const { container } = render(<DiagnosticIntro />);

    const text = container.textContent ?? "";
    for (const banned of ["失敗", "太慢", "你不會", "Game Over"]) {
      expect(text).not.toContain(banned);
    }
  });
});

describe("DiagnosticEmptyState", () => {
  it("保留 fail-closed 聲明並提供回首頁的下一步", () => {
    render(<DiagnosticEmptyState />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "診斷題還在準備中" })).toBeInTheDocument();
    expect(screen.getByText(/診斷題暫時不足/)).toBeInTheDocument();
    expect(screen.getByText(/進度沒有被改動/)).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "回英雄島首頁" });
    expect(link).toHaveAttribute("href", "/");
  });
});
