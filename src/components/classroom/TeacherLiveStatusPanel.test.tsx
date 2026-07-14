import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherLiveStatusPanel } from "./TeacherLiveStatusPanel";

describe("TeacherLiveStatusPanel", () => {
  it("shows support-oriented states without scores, speed, or ranking", () => {
    const { container } = render(
      <TeacherLiveStatusPanel
        participants={[
          { nickname: "小浪", state: "joined" },
          { nickname: "星星 7 號", state: "in_progress" },
          { nickname: "綠芽", state: "completed" },
          { nickname: "藍鯨", state: "may_need_help" },
        ]}
      />,
    );

    expect(screen.getByText("已加入").closest("article")).toHaveTextContent("1");
    expect(screen.getByText("進行中").closest("article")).toHaveTextContent("1");
    expect(screen.getByText("已完成").closest("article")).toHaveTextContent("1");
    expect(screen.getByText("可能需要協助").closest("article")).toHaveTextContent("1");
    expect(screen.getByText("藍鯨")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/分數|速度|排名|XP/);
  });
});
