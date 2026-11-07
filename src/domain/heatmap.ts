import { addDays, daysBetween, weekStart, type DayKey } from './day'

export const HEATMAP_WEEKS = 16

export interface HeatCell {
  day: DayKey
  minutes: number
  /** 0 (nothing) to 4. */
  level: 0 | 1 | 2 | 3 | 4
  today: boolean
  future: boolean
}

/** 0 for nothing, 1 for under the daily goal, then 1x, 3x and 6x the goal. */
export function level(minutes: number, hitMinutes: number): HeatCell['level'] {
  if (minutes <= 0) return 0
  if (minutes < hitMinutes) return 1
  if (minutes < hitMinutes * 3) return 2
  if (minutes < hitMinutes * 6) return 3
  return 4
}

/** Columns are weeks (oldest first), rows are Monday to Sunday. The last column holds `today`. */
export function heatmap(
  totals: ReadonlyMap<DayKey, number>,
  today: DayKey,
  hitMinutes: number,
): HeatCell[][] {
  const firstMonday = addDays(weekStart(today), -7 * (HEATMAP_WEEKS - 1))

  return Array.from({ length: HEATMAP_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(firstMonday, w * 7 + d)
      const minutes = totals.get(day) ?? 0
      return {
        day,
        minutes,
        level: level(minutes, hitMinutes),
        today: day === today,
        future: daysBetween(today, day) > 0,
      }
    }),
  )
}
