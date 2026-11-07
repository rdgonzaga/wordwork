import { describe, expect, it } from 'vitest'
import type { Rating, Review, Schedule } from '../../db/schema'
import type { DaySettings } from '../day'
import { fuzzFactor, newSchedule, replay, schedule } from './scheduler'

const settings: DaySettings = { timeZone: 'Asia/Manila', rolloverHour: 4 }
// 2026-11-07 12:00 Manila, study day 2026-11-07
const NOON = new Date('2026-11-07T04:00:00Z')
const MIN = 60_000

const AGAIN: Rating = 1
const HARD: Rating = 2
const GOOD: Rating = 3
const EASY: Rating = 4

function review(over: Partial<Schedule> = {}): Schedule {
  return {
    ...newSchedule('card-1'),
    state: 'review',
    ease: 2.5,
    intervalDays: 10,
    dueDay: '2026-11-07',
    reps: 5,
    ...over,
  }
}

describe('new and learning cards', () => {
  const fresh = newSchedule('card-1')

  it('starts new with ease 2.5', () => {
    expect(fresh).toMatchObject({ state: 'new', step: 0, ease: 2.5, reps: 0, lapses: 0 })
  })

  it('Again → first step, due in 1 minute', () => {
    const s = schedule(fresh, AGAIN, NOON, settings)
    expect(s).toMatchObject({ state: 'learning', step: 0, dueAt: NOON.getTime() + MIN, reps: 1 })
    expect(s.dueDay).toBeUndefined()
  })

  it('Hard → repeats the current step', () => {
    const atStep1 = { ...fresh, state: 'learning' as const, step: 1 }
    expect(schedule(fresh, HARD, NOON, settings).dueAt).toBe(NOON.getTime() + MIN)
    expect(schedule(atStep1, HARD, NOON, settings)).toMatchObject({
      step: 1,
      dueAt: NOON.getTime() + 10 * MIN,
    })
  })

  it('Good → next step, then graduates to 1 day', () => {
    const s1 = schedule(fresh, GOOD, NOON, settings)
    expect(s1).toMatchObject({ state: 'learning', step: 1, dueAt: NOON.getTime() + 10 * MIN })

    const s2 = schedule(s1, GOOD, NOON, settings)
    expect(s2).toMatchObject({ state: 'review', intervalDays: 1, dueDay: '2026-11-08' })
    expect(s2.dueAt).toBeUndefined()
  })

  it('Easy → graduates straight to 4 days', () => {
    expect(schedule(fresh, EASY, NOON, settings)).toMatchObject({
      state: 'review',
      intervalDays: 4,
      dueDay: '2026-11-11',
    })
  })

  it('graduating before rollover counts from the study day, not the calendar day', () => {
    // 03:59 Manila on the 8th is still study day the 7th, so 1 day → due the 8th at 4 AM
    const lateNight = new Date('2026-11-07T19:59:00Z')
    const learning = { ...fresh, state: 'learning' as const, step: 1 }
    expect(schedule(learning, GOOD, lateNight, settings).dueDay).toBe('2026-11-08')
  })

  it('learning steps cross the rollover by timestamp', () => {
    const lateNight = new Date('2026-11-07T19:55:00Z') // 03:55, study day the 7th
    const s = schedule({ ...fresh, state: 'learning', step: 1 }, HARD, lateNight, settings)
    expect(s.dueAt).toBe(lateNight.getTime() + 10 * MIN) // 04:05, the next study day
  })
})

describe('review cards', () => {
  it('Again → lapse, ease −0.20, relearn in 10 minutes', () => {
    const s = schedule(review(), AGAIN, NOON, settings)
    expect(s).toMatchObject({
      state: 'relearning',
      step: 0,
      lapses: 1,
      dueAt: NOON.getTime() + 10 * MIN,
    })
    expect(s.ease).toBeCloseTo(2.3)
    expect(s.dueDay).toBeUndefined()
  })

  it('relearning Good → back to review in 1 day', () => {
    const lapsed = schedule(review(), AGAIN, NOON, settings)
    expect(schedule(lapsed, GOOD, NOON, settings)).toMatchObject({
      state: 'review',
      intervalDays: 1,
      dueDay: '2026-11-08',
    })
  })

  it('relearning Again and Hard stay on the 10 minute step', () => {
    const lapsed = schedule(review(), AGAIN, NOON, settings)
    for (const r of [AGAIN, HARD]) {
      expect(schedule(lapsed, r, NOON, settings)).toMatchObject({
        state: 'relearning',
        dueAt: NOON.getTime() + 10 * MIN,
      })
    }
  })

  it('relearning Easy → 2 days, still above Good', () => {
    const lapsed = schedule(review(), AGAIN, NOON, settings)
    expect(schedule(lapsed, EASY, NOON, settings).intervalDays).toBe(2)
  })

  it('Hard → ×1.2, ease −0.15', () => {
    const s = schedule(review(), HARD, NOON, settings)
    expect(s.intervalDays).toBe(Math.round(12 * (1 + fuzzFactor('card-1', 5))))
    expect(s.ease).toBeCloseTo(2.35)
  })

  it('Good → ×ease, ease unchanged', () => {
    const s = schedule(review(), GOOD, NOON, settings)
    expect(s.intervalDays).toBe(Math.round(25 * (1 + fuzzFactor('card-1', 5))))
    expect(s.ease).toBe(2.5)
    expect(s.dueDay).toBe(addDaysFromNoon(s.intervalDays))
  })

  it('Easy → ×ease×1.3, ease +0.15', () => {
    const s = schedule(review(), EASY, NOON, settings)
    expect(s.intervalDays).toBe(Math.round(32.5 * (1 + fuzzFactor('card-1', 5))))
    expect(s.ease).toBeCloseTo(2.65)
  })

  it('Good adds half the days overdue', () => {
    const late = review({ dueDay: '2026-10-28' }) // 10 days overdue
    const s = schedule({ ...late, cardId: 'no-fuzz' }, GOOD, NOON, settings)
    expect(s.intervalDays).toBe(Math.round((10 + 5) * 2.5 * (1 + fuzzFactor('no-fuzz', 5))))
  })

  it('ease never drops below 1.3', () => {
    let s = review({ ease: 1.35 })
    s = schedule(s, AGAIN, NOON, settings)
    expect(s.ease).toBe(1.3)
    s = schedule(review({ ease: 1.3 }), HARD, NOON, settings)
    expect(s.ease).toBe(1.3)
  })

  it('caps at 365 days', () => {
    const s = schedule(review({ intervalDays: 300 }), EASY, NOON, settings)
    expect(s.intervalDays).toBe(365)
  })

  it('keeps Hard < Good < Easy for short and long intervals, whatever the fuzz', () => {
    // Below the 365 cap, where they'd tie
    for (const intervalDays of [1, 2, 3, 5, 10, 40, 80]) {
      for (const ease of [1.3, 1.5, 2.5, 3]) {
        for (let i = 0; i < 20; i++) {
          const s = review({ cardId: `c${i}`, intervalDays, ease })
          const [h, g, e] = [HARD, GOOD, EASY].map(
            (r) => schedule(s, r, NOON, settings).intervalDays,
          )
          expect(h).toBeGreaterThan(intervalDays)
          expect(g).toBeGreaterThan(h)
          expect(e).toBeGreaterThan(g)
        }
      }
    }
  })
})

describe('fuzz', () => {
  it('stays within ±5% and is seeded by card id + rep count', () => {
    for (let i = 0; i < 200; i++) {
      const f = fuzzFactor(`card-${i}`, i % 7)
      expect(Math.abs(f)).toBeLessThanOrEqual(0.05)
      expect(fuzzFactor(`card-${i}`, i % 7)).toBe(f)
    }
    expect(fuzzFactor('a', 1)).not.toBe(fuzzFactor('a', 2))
  })

  it('is not applied at 2 days or less', () => {
    const lapsed = schedule(review(), AGAIN, NOON, settings)
    expect(schedule(lapsed, EASY, NOON, settings).intervalDays).toBe(2)
  })
})

describe('replay', () => {
  const rev = (id: string, rating: Rating, iso: string): Review => ({
    id,
    cardId: 'card-1',
    rating,
    reviewedAt: Date.parse(iso),
    day: '',
    durationMs: 0,
    deviceId: 'd',
    updatedAt: 0,
    deleted: false,
    dirty: 0,
  })

  const log = [
    rev('a', GOOD, '2026-11-01T01:00:00Z'),
    rev('b', GOOD, '2026-11-01T01:10:00Z'),
    rev('c', GOOD, '2026-11-02T01:00:00Z'),
    rev('d', AGAIN, '2026-11-05T01:00:00Z'),
    rev('e', GOOD, '2026-11-05T01:10:00Z'),
    rev('f', EASY, '2026-11-06T01:00:00Z'),
  ]

  it('folds the log in time order', () => {
    let expected = newSchedule('card-1')
    for (const r of log) expected = schedule(expected, r.rating, new Date(r.reviewedAt), settings)
    expect(replay('card-1', log, settings)).toEqual(expected)
  })

  it('gives the same schedule whatever order the log arrives in', () => {
    const want = replay('card-1', log, settings)
    for (let seed = 1; seed < 10; seed++) {
      const shuffled = [...log].sort((x, y) => hash(x.id + seed) - hash(y.id + seed))
      expect(replay('card-1', shuffled, settings)).toEqual(want)
    }
  })

  it('skips deleted reviews and other cards', () => {
    const noise = [
      { ...rev('x', AGAIN, '2026-11-03T00:00:00Z'), deleted: true },
      { ...rev('y', AGAIN, '2026-11-03T00:00:00Z'), cardId: 'other' },
    ]
    expect(replay('card-1', [...log, ...noise], settings)).toEqual(replay('card-1', log, settings))
  })

  it('an empty log is a new card', () => {
    expect(replay('card-1', [], settings)).toEqual(newSchedule('card-1'))
  })
})

function addDaysFromNoon(n: number): string {
  const d = new Date('2026-11-07T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function hash(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return h
}
