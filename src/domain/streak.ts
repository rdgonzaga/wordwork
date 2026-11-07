import { addDays, type DayKey } from './day'

export interface StreakState {
  /** Hit days in the current run. Bridged misses aren't counted. */
  streak: number
  /** Yesterday was missed and today isn't there yet: another miss ends the run. */
  atRisk: boolean
}

/**
 * One missed day is bridged, two in a row end the run. Today is never a miss while it's still
 * going. `totals` is minutes per study day across all languages.
 */
export function streakState(
  totals: ReadonlyMap<DayKey, number>,
  today: DayKey,
  hitMinutes: number,
): StreakState {
  const hit = (day: DayKey) => (totals.get(day) ?? 0) >= hitMinutes

  const todayHit = hit(today)
  let streak = todayHit ? 1 : 0
  let misses = 0

  let day = addDays(today, -1)
  const yesterdayMissed = !hit(day)

  // Past the oldest entry every day is a miss, so two of them stop the walk.
  while (misses < 2) {
    if (hit(day)) {
      streak++
      misses = 0
    } else {
      misses++
    }
    day = addDays(day, -1)
  }

  return { streak, atRisk: streak > 0 && !todayHit && yesterdayMissed }
}
