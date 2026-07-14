import { Flame, SunMedium } from "lucide-react";
import type { ProgressSnapshot } from "@/infrastructure/progress/progress-types";

export function StreakGlow({
  streak,
  compact = false,
}: {
  streak: ProgressSnapshot["streak"];
  compact?: boolean;
}) {
  const recoveryDays = Math.max(0, 3 - streak.brightness);
  const message =
    streak.brightness === 3
      ? "光芒很穩定；休息不會讓已學會的能力消失。"
      : `營火仍然保留著。有空再完成 ${recoveryDays} 個新的學習日，就會逐步回亮。`;

  return (
    <section
      className={`streak-glow glow-${streak.brightness} ${compact ? "compact-glow" : ""}`}
      aria-label={`島嶼亮度 ${streak.brightness} 格，共完成 ${streak.completedDates.length} 個學習日`}
    >
      <span className="glow-icon" aria-hidden="true">
        {streak.brightness >= 2 ? <SunMedium /> : <Flame />}
      </span>
      <div className="glow-copy">
        <p className="eyebrow">可恢復連續進度</p>
        <h2>島嶼亮度 {streak.brightness}／3</h2>
        <p>{message}</p>
      </div>
      <div className="glow-pips" aria-hidden="true">
        {[1, 2, 3].map((level) => (
          <span className={level <= streak.brightness ? "lit" : ""} key={level} />
        ))}
      </div>
      <strong className="study-days">{streak.completedDates.length} 個學習日</strong>
    </section>
  );
}
