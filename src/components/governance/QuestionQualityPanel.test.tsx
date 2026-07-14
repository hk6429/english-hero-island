import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  QuestionQualityPanel,
  type QuestionQualityFinding,
} from "./QuestionQualityPanel";

const findings: ReadonlyArray<QuestionQualityFinding> = [
  {
    id: "multiple-answers",
    questionId: "question-1",
    questionVersion: 1,
    severity: "blocking",
    title: "可能有多個合理答案",
    description: "兩個選項都能依題幹成立，發布前必須修正。",
    evidence: "選項 A 與 C 的語意相同",
  },
  {
    id: "audio-rate",
    questionId: "question-2",
    questionVersion: 1,
    severity: "warning",
    title: "音訊速度高於同年級基準",
    description: "建議英語教師再次試聽。",
  },
  {
    id: "response-count",
    questionId: "question-3",
    questionVersion: 1,
    severity: "info",
    title: "已有 18 份學生作答證據",
    description: "最近七天未出現作答率異常。",
  },
];

describe("QuestionQualityPanel", () => {
  afterEach(cleanup);

  it("groups blocking, warning, and informational findings with text labels", () => {
    render(
      <QuestionQualityPanel
        assetDataState={{ state: "sufficient", message: "素材檢查完成。" }}
        dataState={{ state: "sufficient", message: "已取得足夠的內容與作答證據。" }}
        findings={findings}
      />,
    );

    const blockingGroup = screen.getByRole("region", { name: "阻擋發布（1）" });
    expect(
      within(blockingGroup).getByText("嚴重度：阻擋發布"),
    ).toBeInTheDocument();
    expect(
      within(blockingGroup).getByText("可能有多個合理答案"),
    ).toBeInTheDocument();
    expect(
      within(blockingGroup).getByText("證據：選項 A 與 C 的語意相同"),
    ).toBeInTheDocument();

    const warningGroup = screen.getByRole("region", { name: "需要留意（1）" });
    expect(within(warningGroup).getByText("嚴重度：警告")).toBeInTheDocument();
    expect(
      within(warningGroup).getByText("音訊速度高於同年級基準"),
    ).toBeInTheDocument();

    const infoGroup = screen.getByRole("region", { name: "參考資訊（1）" });
    expect(within(infoGroup).getByText("嚴重度：資訊")).toBeInTheDocument();
    expect(
      screen.getByText("資料充足：已取得足夠的內容與作答證據。"),
    ).toBeInTheDocument();
  });

  it("does not imply quality is clear when evidence is insufficient", () => {
    render(
      <QuestionQualityPanel
        assetDataState={{ state: "insufficient", message: "仍有素材待真人確認。" }}
        dataState={{
          state: "insufficient",
          message: "目前只有 2 份作答證據，至少需要 10 份。",
        }}
        findings={[]}
      />,
    );

    expect(
      screen.getByText("資料不足：目前只有 2 份作答證據，至少需要 10 份。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("證據不足，不能判定為沒有品質問題。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("目前沒有品質訊號。")).not.toBeInTheDocument();
  });
});
