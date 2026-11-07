import type { Rating, Schedule } from '../../db/schema'
import type { DaySettings } from '../day'
import { schedule } from './scheduler'

const MIN = 60_000

/** Short label for the wait after `rating`, e.g. "1m", "10m", "1d", "2.3mo". */
export function preview(state: Schedule, rating: Rating, now: Date, settings: DaySettings): string {
  const next = schedule(state, rating, now, settings)
  if (next.dueAt !== undefined)
    return formatInterval({ minutes: (next.dueAt - now.getTime()) / MIN })
  return formatInterval({ days: next.intervalDays })
}

export function previewAll(
  state: Schedule,
  now: Date,
  settings: DaySettings,
): Record<Rating, string> {
  return {
    1: preview(state, 1, now, settings),
    2: preview(state, 2, now, settings),
    3: preview(state, 3, now, settings),
    4: preview(state, 4, now, settings),
  }
}

export function formatInterval(i: { minutes: number } | { days: number }): string {
  if ('minutes' in i) {
    return i.minutes < 60 ? `${Math.round(i.minutes)}m` : `${oneDecimal(i.minutes / 60)}h`
  }
  if (i.days < 30) return `${i.days}d`
  if (i.days < 365) return `${oneDecimal(i.days / 30)}mo`
  return `${oneDecimal(i.days / 365)}y`
}

/** 2.33 → "2.3", 1.0 → "1". */
function oneDecimal(n: number): string {
  return String(Math.round(n * 10) / 10)
}
