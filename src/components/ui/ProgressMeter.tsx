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
  const safeMax = Math.max(1, max);
  const safeValue = Math.min(safeMax, Math.max(0, value));

  return (
    <div className="meter-block">
      <div className="meter-label">
        <span>{label}</span>
        <span>
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
      >
        <span style={{ transform: `scaleX(${safeValue / safeMax})` }} />
      </div>
    </div>
  );
}
