export function ProgressMeter({
  label,
  value,
  max,
  tone = "ocean",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "ocean" | "forest" | "gold";
}) {
  const safeMax = Number.isFinite(max) ? Math.max(1, Math.round(max)) : 1;
  const safeValue = Number.isFinite(value)
    ? Math.min(safeMax, Math.max(0, Math.round(value)))
    : 0;

  return (
    <div className="meter-block">
      <div className="meter-label">
        <span>{label}</span>
        <span aria-hidden="true">
          {safeValue}／{safeMax}
        </span>
      </div>
      <div
        className={`progress-track progress-${tone}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeValue}／${safeMax}`}
      >
        <span style={{ transform: `scaleX(${safeValue / safeMax})` }} />
      </div>
    </div>
  );
}
