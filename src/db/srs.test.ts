import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb, type Card, type WordworkDb } from './schema.ts'
import { loadStudyState, rateCard, undoReview } from './srs.ts'
import { updateSettings } from './settings.ts'

const day1 = new Date('2026-11-01T05:00:00Z')
const day2 = new Date('2026-11-02T05:00:00Z')
const deckId = 'deck'

let db: WordworkDb
let n = 0

beforeEach(() => {
  db = createDb(`srs-test-${n++}`)
})

afterEach(async () => {
  await db.delete()
})

function card(i: number): Card {
  return {
    id: `c${i}`,
    deckId,
    term: `t${i}`,
    translation: `m${i}`,
    extra: {},
    tags: [],
    newOrder: i,
    suspended: false,
    createdAt: 0,
    updatedAt: 0,
    deleted: false,
    dirty: 0,
  }
}

async function graduate(cardId: string, at: Date) {
  await rateCard(db, cardId, 3, at, 0)
  await rateCard(db, cardId, 3, new Date(at.getTime() + 60_000), 0)
}

describe('loadStudyState', () => {
  it('counts new cards from older days, not only today', async () => {
    await db.cards.bulkPut([0, 1, 2, 3].map(card))
    await updateSettings(db, { newPerDay: 2 }, day1)
    // Two cards first seen (and graduated, due tomorrow) on day 1.
    await graduate('c0', day1)
    await graduate('c1', day1)

    // Day 2: those are not new again, so the full new limit is still available.
    const state = await loadStudyState(db, deckId, day2)
    const fresh = state.queue.filter((q) => q.kind === 'new').map((q) => q.cardId)
    expect(fresh).toEqual(['c2', 'c3'])
  })

  it('stops new cards once today’s limit is used', async () => {
    await db.cards.bulkPut([0, 1, 2].map(card))
    await updateSettings(db, { newPerDay: 1 }, day1)
    await rateCard(db, 'c0', 1, day1, 0)
    const state = await loadStudyState(db, deckId, day1)
    expect(state.queue.filter((q) => q.kind === 'new')).toHaveLength(0)
  })

  it('skips deleted cards', async () => {
    await db.cards.bulkPut([card(0), { ...card(1), deleted: true }])
    const state = await loadStudyState(db, deckId, day1)
    expect(state.queue.map((q) => q.cardId)).toEqual(['c0'])
  })
})

describe('rateCard / undoReview', () => {
  it('logs the review with today’s day key and caches the schedule', async () => {
    await db.cards.put(card(0))
    const { review, schedule } = await rateCard(db, 'c0', 3, day1, 1200)
    expect(review).toMatchObject({ day: '2026-11-01', durationMs: 1200, dirty: 1, deleted: false })
    expect(schedule.state).toBe('learning')
    expect(await db.schedules.get('c0')).toEqual(schedule)
  })

  it('undo tombstones the review and restores the previous schedule', async () => {
    await db.cards.put(card(0))
    const first = await rateCard(db, 'c0', 3, day1, 0)
    const second = await rateCard(db, 'c0', 3, new Date(day1.getTime() + 60_000), 0)
    expect(second.schedule.state).toBe('review')

    const restored = await undoReview(db, second.review.id, day1)
    expect(restored).toEqual(first.schedule)
    expect((await db.reviews.get(second.review.id))?.deleted).toBe(true)
  })

  it('undoing the only review returns the card to new', async () => {
    await db.cards.put(card(0))
    const { review } = await rateCard(db, 'c0', 3, day1, 0)
    const restored = await undoReview(db, review.id, day1)
    expect(restored?.state).toBe('new')
    expect(await db.schedules.get('c0')).toBeUndefined()
  })

  it('reuses one device id', async () => {
    await db.cards.put(card(0))
    const a = await rateCard(db, 'c0', 1, day1, 0)
    const b = await rateCard(db, 'c0', 1, day1, 0)
    expect(a.review.deviceId).toBe(b.review.deviceId)
  })
})
