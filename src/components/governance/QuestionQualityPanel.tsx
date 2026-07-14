export type QuestionQualitySeverity = "blocking" | "warning" | "info";

export type QuestionQualityFinding = Readonly<{
  id: string;
  questionId: string;
  questionVersion: number;
  severity: QuestionQualitySeverity;
  title: string;
  description: string;
  evidence?: string | null;
}>;

export type QuestionQualityDataState = Readonly<{
  state: "sufficient" | "insufficient";
  message: string;
}>;

type Props = Readonly<{
  assetDataState: QuestionQualityDataState;
  findings: ReadonlyArray<QuestionQualityFinding>;
  dataState: QuestionQualityDataState;
}>;

const groupDetails: ReadonlyArray<
  Readonly<{
    severity: QuestionQualitySeverity;
    heading: string;
    severityLabel: string;
  }>
> = [
  { severity: "blocking", heading: "阻擋發布", severityLabel: "阻擋發布" },
  { severity: "warning", heading: "需要留意", severityLabel: "警告" },
  { severity: "info", heading: "參考資訊", severityLabel: "資訊" },
];

export function QuestionQualityPanel({ assetDataState, findings, dataState }: Props) {
  return (
    <section aria-label="題目品質檢查">
      <header>
        <h2>題目品質檢查</h2>
        <p>品質訊號協助人工判讀，不會自動取代真人複核。</p>
      </header>

      <p aria-live="polite">
        {dataState.state === "sufficient" ? "資料充足" : "資料不足"}：
        {dataState.message}
      </p>
      <p aria-live="polite">
        {assetDataState.state === "sufficient" ? "素材檢查完成" : "素材檢查未完成"}：
        {assetDataState.message}
      </p>

      {findings.length === 0 ? (
        <p>
          {dataState.state === "insufficient"
            ? "證據不足，不能判定為沒有品質問題。"
            : "目前沒有品質訊號。"}
        </p>
      ) : null}

      {groupDetails.map((group) => {
        const groupedFindings = findings.filter(
          (finding) => finding.severity === group.severity,
        );
        if (groupedFindings.length === 0) return null;

        const heading = `${group.heading}（${groupedFindings.length}）`;
        return (
          <section aria-label={heading} key={group.severity}>
            <h3>{heading}</h3>
            <ul>
              {groupedFindings.map((finding) => (
                <li key={finding.id}>
                  <article>
                    <p>{`嚴重度：${group.severityLabel}`}</p>
                    <h4>{finding.title}</h4>
                    <p>{finding.description}</p>
                    {finding.evidence ? (
                      <p>{`證據：${finding.evidence}`}</p>
                    ) : null}
                  </article>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
