import type { DayKey } from './day'

/** Longest single entry, in minutes. The server column is a plain integer. */
export const MAX_ENTRY_MINUTES = 1_440

/** A card that sat open longer than this counts as this long: the rest was a break. */
export const REVIEW_IDLE_CAP_MS = 60_000

export function totalMinutes(rows: { minutes: number; deleted: boolean }[]): number {
  return rows.reduce((sum, r) => (r.deleted ? sum : sum + r.minutes), 0)
}

/** Minutes per study day, deleted rows left out. */
export function dayTotals(
  rows: { day: DayKey; minutes: number; deleted: boolean }[],
): Map<DayKey, number> {
  const totals = new Map<DayKey, number>()
  for (const r of rows) {
    if (!r.deleted) totals.set(r.day, (totals.get(r.day) ?? 0) + r.minutes)
  }
  return totals
}

/** Time actually spent on one card: never negative, never past the idle cap. */
export function activeMs(durationMs: number): number {
  if (!Number.isFinite(durationMs)) return 0
  return Math.min(REVIEW_IDLE_CAP_MS, Math.max(0, durationMs))
}

export interface Progress {
  hours: number
  goalHours: number
  /** Whole percent, 0 to 100. */
  percent: number
}

export function progress(minutes: number, goalHours: number): Progress {
  const hours = minutes / 60
  const percent = goalHours > 0 ? Math.min(100, Math.floor((hours / goalHours) * 100)) : 0
  return { hours, goalHours, percent }
}

/** `12.5`, or `12` when it's a whole number. */
export function formatHours(minutes: number): string {
  const h = Math.round((minutes / 60) * 10) / 10
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
}
