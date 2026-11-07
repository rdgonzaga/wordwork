import type { Rating, Review, Schedule } from '../../db/schema'
import { addDays, daysBetween, toDay, type DaySettings } from '../day'

const MIN = 60_000

/** Learning steps for new cards: 1 m, 10 m. */
export const LEARNING_STEPS = [1 * MIN, 10 * MIN]
/** Relearning steps after a lapse: 10 m. */
export const RELEARNING_STEPS = [10 * MIN]

const START_EASE = 2.5
const MIN_EASE = 1.3
const MAX_INTERVAL = 365
const FUZZ = 0.05

const GRADUATE_DAYS = 1
const GRADUATE_EASY_DAYS = 4
const RELEARN_DAYS = 1
const RELEARN_EASY_DAYS = 2

export function newSchedule(cardId: string): Schedule {
  return {
    cardId,
    state: 'new',
    step: 0,
    ease: START_EASE,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
  }
}

/**
 * The card's next schedule after `rating` at `now`. Pure: everything time-dependent comes from
 * `now` and `settings`. Kept behind this one signature so FSRS could replace it later.
 */
export function schedule(
  state: Schedule,
  rating: Rating,
  now: Date,
  settings: DaySettings,
): Schedule {
  const base = { ...state, reps: state.reps + 1 }

  if (state.state === 'review') return scheduleReview(base, state, rating, now, settings)

  const relearning = state.state === 'relearning'
  const steps = relearning ? RELEARNING_STEPS : LEARNING_STEPS
  const step = Math.min(state.step, steps.length - 1)

  const toLearningStep = (next: number): Schedule => ({
    ...base,
    state: relearning ? 'relearning' : 'learning',
    step: next,
    dueAt: now.getTime() + steps[next],
    dueDay: undefined,
  })

  switch (rating) {
    case 1:
      return toLearningStep(0)
    case 2:
      return toLearningStep(step)
    case 3:
      if (step + 1 < steps.length) return toLearningStep(step + 1)
      return graduate(base, relearning ? RELEARN_DAYS : GRADUATE_DAYS, now, settings)
    case 4:
      return graduate(base, relearning ? RELEARN_EASY_DAYS : GRADUATE_EASY_DAYS, now, settings)
  }
}

function graduate(base: Schedule, days: number, now: Date, settings: DaySettings): Schedule {
  const intervalDays = fuzz(days, base.cardId, base.reps - 1)
  return {
    ...base,
    state: 'review',
    step: 0,
    intervalDays,
    dueDay: addDays(toDay(now, settings), intervalDays),
    dueAt: undefined,
  }
}

function scheduleReview(
  base: Schedule,
  state: Schedule,
  rating: Rating,
  now: Date,
  settings: DaySettings,
): Schedule {
  if (rating === 1) {
    return {
      ...base,
      state: 'relearning',
      step: 0,
      ease: Math.max(MIN_EASE, round2(state.ease - 0.2)),
      lapses: state.lapses + 1,
      dueAt: now.getTime() + RELEARNING_STEPS[0],
      dueDay: undefined,
    }
  }

  const today = toDay(now, settings)
  const intervals = reviewIntervals(state, today)
  const intervalDays =
    rating === 2 ? intervals.hard : rating === 3 ? intervals.good : intervals.easy
  const easeDelta = rating === 2 ? -0.15 : rating === 4 ? 0.15 : 0

  return {
    ...base,
    ease: Math.max(MIN_EASE, round2(state.ease + easeDelta)),
    intervalDays,
    dueDay: addDays(today, intervalDays),
    dueAt: undefined,
  }
}

/** Hard/Good/Easy intervals for a review card: fuzzed, then forced strictly increasing, then capped. */
function reviewIntervals(state: Schedule, today: string) {
  const current = Math.max(1, state.intervalDays)
  const overdue = state.dueDay ? Math.max(0, daysBetween(state.dueDay, today)) : 0
  const f = (days: number) => fuzz(days, state.cardId, state.reps)

  const hard = Math.max(current + 1, f(current * 1.2))
  const good = Math.max(hard + 1, f((current + overdue / 2) * state.ease))
  const easy = Math.max(good + 1, f((current + overdue) * state.ease * 1.3))

  const cap = (d: number) => Math.min(MAX_INTERVAL, d)
  return { hard: cap(hard), good: cap(good), easy: cap(easy) }
}

function fuzz(days: number, cardId: string, reps: number): number {
  if (days <= 2) return Math.round(days)
  return Math.round(days * (1 + fuzzFactor(cardId, reps)))
}

/** Deterministic factor in [−5 %, +5 %] seeded by card id and rep count, so every device agrees. */
export function fuzzFactor(cardId: string, reps: number): number {
  // FNV-1a, 32 bit
  let h = 0x811c9dc5
  for (const ch of `${cardId}:${reps}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193)
  }
  const unit = (h >>> 0) / 0xffffffff
  return (unit * 2 - 1) * FUZZ
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Rebuild a card's schedule from its review log. Order-independent: sorts by time, then id. */
export function replay(cardId: string, reviews: Review[], settings: DaySettings): Schedule {
  return reviews
    .filter((r) => r.cardId === cardId && !r.deleted)
    .sort((a, b) => a.reviewedAt - b.reviewedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .reduce((s, r) => schedule(s, r.rating, new Date(r.reviewedAt), settings), newSchedule(cardId))
}
