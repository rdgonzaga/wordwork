import { daysBetween, weekday, type DayKey } from './day.ts'

/** 1-based week of the plan that `today` falls in. Days before the start count as week 1. */
export function currentWeek(start: DayKey, today: DayKey): number {
  return Math.max(0, Math.floor(daysBetween(start, today) / 7)) + 1
}

export type DayKind = 'weekday' | 'saturday' | 'sunday'

export function dayKind(day: DayKey): DayKind {
  const d = weekday(day)
  return d === 5 ? 'saturday' : d === 6 ? 'sunday' : 'weekday'
}

export interface AutoInput {
  /** Cards still in today's German queue. */
  queueLeft: number
  /** German ratings given today. */
  reviewedToday: number
  /** German cards with at least one review, ever. */
  reviewedCards: number
  diaryToday: boolean
  songThisWeek: boolean
}

/** Items the app can tick on its own. Ids match the guide content. */
export function autoTicks(i: AutoInput): Set<string> {
  const out = new Set<string>()
  if (i.reviewedToday > 0 && i.queueLeft === 0) out.add('daily.reviews')
  if (i.diaryToday) out.add('daily.sentence')
  if (i.songThisWeek) out.add('daily.song')
  if (i.reviewedCards >= 10) out.add('setup.first-cards')
  return out
}
