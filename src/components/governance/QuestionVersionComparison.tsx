import styles from "./governance.module.css";

export type QuestionVersionFieldValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<string>;

export type QuestionVersionField = Readonly<{
  key: string;
  label: string;
  value: QuestionVersionFieldValue;
}>;

export type QuestionVersionSnapshot = Readonly<{
  questionId: string;
  version: number;
  statusLabel: string;
  changeSummary?: string | null;
  fields: ReadonlyArray<QuestionVersionField>;
}>;

type Props = Readonly<{
  before: QuestionVersionSnapshot;
  after: QuestionVersionSnapshot;
}>;

function displayValue(value: QuestionVersionFieldValue | undefined) {
  if (value === undefined || value === null || value === "") return "未提供";
  if (Array.isArray(value)) return value.length > 0 ? value.join("；") : "未提供";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function canonicalValue(value: QuestionVersionFieldValue | undefined) {
  if (value === undefined || value === null || value === "") return null;
  return Array.isArray(value) ? [...value] : value;
}

export function QuestionVersionComparison({ before, after }: Props) {
  const beforeFields = new Map(before.fields.map((field) => [field.key, field]));
  const afterFields = new Map(after.fields.map((field) => [field.key, field]));
  const fieldKeys = [
    ...before.fields.map((field) => field.key),
    ...after.fields.map((field) => field.key),
  ].filter((key, index, allKeys) => allKeys.indexOf(key) === index);
  const comparisonRows = fieldKeys.map((key) => {
    const beforeField = beforeFields.get(key);
    const afterField = afterFields.get(key);
    return {
      key,
      label: afterField?.label ?? beforeField?.label ?? key,
      beforeValue: beforeField?.value,
      afterValue: afterField?.value,
      changed:
        JSON.stringify(canonicalValue(beforeField?.value)) !==
        JSON.stringify(canonicalValue(afterField?.value)),
    };
  });
  const changedCount = comparisonRows.filter((row) => row.changed).length;

  return (
    <section aria-label={`${before.questionId} 版本比較`}>
      <header>
        <h2>{`${before.questionId} 版本比較`}</h2>
        <p>{`第 ${before.version} 版狀態：${before.statusLabel}`}</p>
        <p>{`第 ${after.version} 版狀態：${after.statusLabel}`}</p>
        {after.changeSummary ? <p>{`本版修改：${after.changeSummary}`}</p> : null}
      </header>

      <p
        aria-live="polite"
        className={styles.diffSummary}
        data-has-changes={changedCount > 0 ? "true" : "false"}
      >
        {changedCount === 0
          ? `全部 ${comparisonRows.length} 個比較欄位皆無變更。`
          : `${changedCount} 個欄位已變更，${comparisonRows.length - changedCount} 個欄位無變更。`}
      </p>

      <div
        aria-label="版本比較表格，可左右捲動"
        className="version-comparison-scroll"
        role="region"
        tabIndex={0}
      >
        <table>
          <caption>欄位逐項差異</caption>
          <thead>
            <tr>
              <th scope="col">欄位</th>
              <th scope="col">{`第 ${before.version} 版（修改前）`}</th>
              <th scope="col">{`第 ${after.version} 版（修改後）`}</th>
              <th scope="col">比較結果</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr
                className={styles.diffRow}
                data-changed={row.changed ? "true" : "false"}
                key={row.key}
              >
                <th scope="row">{row.label}</th>
                <td>{displayValue(row.beforeValue)}</td>
                <td>{displayValue(row.afterValue)}</td>
                <td>
                  <span
                    className={styles.diffBadge}
                    data-changed={row.changed ? "true" : "false"}
                  >
                    {row.changed ? "已變更" : "無變更"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
