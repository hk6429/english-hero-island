export type StreakState = Readonly<{
  completedDates: string[];
  brightness: 0 | 1 | 2 | 3;
}>;

function daysBetween(earlier: string, later: string): number {
  const millisecondsPerDay = 86_400_000;
  const earlierTime = Date.parse(`${earlier}T00:00:00.000Z`);
  const laterTime = Date.parse(`${later}T00:00:00.000Z`);
  return Math.round((laterTime - earlierTime) / millisecondsPerDay);
}

export function updateStreak(streak: StreakState, completedDate: string): StreakState {
  if (streak.completedDates.includes(completedDate)) return streak;

  const latestDate = [...streak.completedDates].sort().at(-1);
  const gap = latestDate ? daysBetween(latestDate, completedDate) : 0;
  const brightness: StreakState["brightness"] =
    !latestDate
      ? 3
      : gap === 1
        ? (Math.min(3, streak.brightness + 1) as StreakState["brightness"])
        : gap > 1
          ? (Math.max(1, streak.brightness - 1) as StreakState["brightness"])
          : streak.brightness;

  return {
    completedDates: [...streak.completedDates, completedDate].sort(),
    brightness,
  };
}
