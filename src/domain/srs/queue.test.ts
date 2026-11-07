import { describe, expect, it } from 'vitest'
import type { Card, Rating, Review, Schedule } from '../../db/schema'
import { buildQueue, countToday, type QueueSettings } from './queue'
import { newSchedule } from './scheduler'

const settings: QueueSettings = {
  timeZone: 'Asia/Manila',
  rolloverHour: 4,
  newPerDay: 3,
  maxReviewsPerDay: 5,
}
// 12:00 Manila, study day 2026-11-07
const NOON = new Date('2026-11-07T04:00:00Z')
// 03:59:59 Manila on the 8th, still study day the 7th
const BEFORE_ROLLOVER = new Date('2026-11-07T19:59:59Z')
// 04:00 Manila on the 8th, study day the 8th
const AFTER_ROLLOVER = new Date('2026-11-07T20:00:00Z')

function card(id: string, newOrder = 0, over: Partial<Card> = {}): Card {
  return {
    id,
    deckId: 'deck',
    term: id,
    translation: id,
    extra: {},
    tags: [],
    newOrder,
    suspended: false,
    createdAt: 0,
    updatedAt: 0,
    deleted: false,
    dirty: 0,
    ...over,
  }
}

const reviewCard = (cardId: string, dueDay: string): Schedule => ({
  ...newSchedule(cardId),
  state: 'review',
  intervalDays: 5,
  dueDay,
  reps: 3,
})

const learningCard = (cardId: string, dueAt: number): Schedule => ({
  ...newSchedule(cardId),
  state: 'learning',
  step: 1,
  dueAt,
  reps: 1,
})

let seq = 0
function rev(cardId: string, rating: Rating, iso: string, day: string): Review {
  return {
    id: `r${seq++}`,
    cardId,
    rating,
    reviewedAt: Date.parse(iso),
    day,
    durationMs: 0,
    deviceId: 'd',
    updatedAt: 0,
    deleted: false,
    dirty: 0,
  }
}

const ids = (q: { cardId: string }[]) => q.map((i) => i.cardId)

describe('buildQueue', () => {
  const none = { newCount: 0, reviewCount: 0 }

  it('orders due learning, then reviews most overdue first', () => {
    const schedules = new Map<string, Schedule>([
      ['r-recent', reviewCard('r-recent', '2026-11-07')],
      ['r-old', reviewCard('r-old', '2026-11-01')],
      ['l-2', learningCard('l-2', NOON.getTime() - 1_000)],
      ['l-1', learningCard('l-1', NOON.getTime() - 60_000)],
    ])
    const cards = [...schedules.keys()].map((id) => card(id))
    const q = buildQueue({ cards, schedules, counts: none, now: NOON, settings })
    expect(q).toEqual([
      { cardId: 'l-1', kind: 'learning' },
      { cardId: 'l-2', kind: 'learning' },
      { cardId: 'r-old', kind: 'review' },
      { cardId: 'r-recent', kind: 'review' },
    ])
  })

  it('leaves out learning cards not yet due and reviews due later', () => {
    const schedules = new Map<string, Schedule>([
      ['l-later', learningCard('l-later', NOON.getTime() + 60_000)],
      ['r-tomorrow', reviewCard('r-tomorrow', '2026-11-08')],
    ])
    const cards = [...schedules.keys()].map((id) => card(id))
    expect(buildQueue({ cards, schedules, counts: none, now: NOON, settings })).toEqual([])
  })

  it('takes new cards by newOrder, mixed evenly into reviews', () => {
    const schedules = new Map<string, Schedule>()
    for (let i = 0; i < 4; i++) schedules.set(`r${i}`, reviewCard(`r${i}`, `2026-11-0${i + 1}`))
    const cards = [...[...schedules.keys()].map((id) => card(id)), card('n2', 2), card('n1', 1)]
    const q = buildQueue({ cards, schedules, counts: none, now: NOON, settings })
    expect(ids(q)).toEqual(['r0', 'r1', 'n1', 'r2', 'r3', 'n2'])
  })

  it('caps new and reviews by what is left of today’s limits', () => {
    const schedules = new Map<string, Schedule>()
    for (let i = 0; i < 9; i++) schedules.set(`r${i}`, reviewCard(`r${i}`, '2026-11-01'))
    const cards = [
      ...[...schedules.keys()].map((id) => card(id)),
      ...[1, 2, 3, 4].map((n) => card(`n${n}`, n)),
    ]
    const q = buildQueue({
      cards,
      schedules,
      counts: { newCount: 2, reviewCount: 3 },
      now: NOON,
      settings,
    })
    expect(q.filter((i) => i.kind === 'new')).toHaveLength(1)
    expect(q.filter((i) => i.kind === 'review')).toHaveLength(2)
  })

  it('never caps due learning cards', () => {
    const schedules = new Map<string, Schedule>()
    for (let i = 0; i < 8; i++) schedules.set(`l${i}`, learningCard(`l${i}`, 0))
    const cards = [...schedules.keys()].map((id) => card(id))
    const counts = { newCount: 99, reviewCount: 99 }
    expect(buildQueue({ cards, schedules, counts, now: NOON, settings })).toHaveLength(8)
  })

  it('skips suspended and deleted cards', () => {
    const cards = [card('a', 1, { suspended: true }), card('b', 2, { deleted: true }), card('c', 3)]
    const q = buildQueue({ cards, schedules: new Map(), counts: none, now: NOON, settings })
    expect(ids(q)).toEqual(['c'])
  })

  it('a review due the 8th waits for the 4 AM rollover', () => {
    const schedules = new Map([['r', reviewCard('r', '2026-11-08')]])
    const cards = [card('r')]
    const at = (now: Date) => buildQueue({ cards, schedules, counts: none, now, settings })
    expect(at(BEFORE_ROLLOVER)).toEqual([])
    expect(ids(at(AFTER_ROLLOVER))).toEqual(['r'])
  })
})

describe('countToday', () => {
  it('counts first reviews as new and review-state ratings as reviews; learning steps are free', () => {
    const log = [
      // n: new today, two learning steps
      rev('n', 3, '2026-11-07T01:00:00Z', '2026-11-07'),
      rev('n', 3, '2026-11-07T01:10:00Z', '2026-11-07'),
      // old: learned on the 1st, reviewed today, lapsed, relearned
      rev('old', 4, '2026-11-01T01:00:00Z', '2026-11-01'),
      rev('old', 1, '2026-11-07T02:00:00Z', '2026-11-07'),
      rev('old', 3, '2026-11-07T02:10:00Z', '2026-11-07'),
    ]
    expect(countToday(log, NOON, settings)).toEqual({ newCount: 1, reviewCount: 1 })
  })

  it('ignores earlier days, so limits reset at the rollover', () => {
    const log = [rev('n', 3, '2026-11-07T19:00:00Z', '2026-11-07')] // 03:00 on the 8th
    expect(countToday(log, BEFORE_ROLLOVER, settings)).toEqual({ newCount: 1, reviewCount: 0 })
    expect(countToday(log, AFTER_ROLLOVER, settings)).toEqual({ newCount: 0, reviewCount: 0 })
  })

  it('counts reviews from every device, in any order', () => {
    const log = [
      rev('b', 4, '2026-11-01T01:00:00Z', '2026-11-01'),
      rev('a', 3, '2026-11-07T03:00:00Z', '2026-11-07'),
      rev('b', 3, '2026-11-07T02:00:00Z', '2026-11-07'),
    ].map((r, i) => ({ ...r, deviceId: `dev${i}` }))
    expect(countToday([...log].reverse(), NOON, settings)).toEqual({
      newCount: 1,
      reviewCount: 1,
    })
  })

  it('skips deleted reviews', () => {
    const log = [{ ...rev('n', 3, '2026-11-07T01:00:00Z', '2026-11-07'), deleted: true }]
    expect(countToday(log, NOON, settings)).toEqual({ newCount: 0, reviewCount: 0 })
  })
})
