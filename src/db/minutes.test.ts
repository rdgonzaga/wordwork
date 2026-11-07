import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { totalMinutes } from '../domain/minutes.ts'
import { addMinutes, addReviewTime, listMinutes, removeMinutes } from './minutes.ts'
import { createDb, type WordworkDb } from './schema.ts'

// 13:00 Manila, study day 2026-11-07
const noon = new Date('2026-11-07T05:00:00Z')
const at = (ms: number) => new Date(noon.getTime() + ms)

let db: WordworkDb
let n = 0

beforeEach(() => {
  db = createDb(`minutes-test-${n++}`)
})

afterEach(async () => {
  await db.delete()
})

describe('addMinutes', () => {
  it('logs a manual entry on the current study day, dirty for sync', async () => {
    const row = await addMinutes(db, 20, noon)
    expect(row).toMatchObject({ day: '2026-11-07', minutes: 20, source: 'manual', dirty: 1 })
    expect(await db.minutes.get(row!.id)).toEqual(row)
  })

  it('uses the study day, not the calendar day, before rollover', async () => {
    // 02:00 Manila on the 8th is still the 7th with a 4 am rollover
    const row = await addMinutes(db, 10, new Date('2026-11-07T18:00:00Z'))
    expect(row?.day).toBe('2026-11-07')
  })

  it('rounds to whole minutes and caps at a day', async () => {
    expect((await addMinutes(db, 12.6, noon))?.minutes).toBe(13)
    expect((await addMinutes(db, 99_999, noon))?.minutes).toBe(1_440)
  })

  it('rejects zero, negative and non-numeric amounts', async () => {
    for (const bad of [0, 0.4, -5, Number.NaN, Infinity]) {
      expect(await addMinutes(db, bad, noon)).toBeUndefined()
    }
    expect(await db.minutes.count()).toBe(0)
  })
})

describe('removeMinutes', () => {
  it('tombstones the entry and drops it from the list and total', async () => {
    const a = await addMinutes(db, 10, noon)
    await addMinutes(db, 40, at(1000))
    await removeMinutes(db, a!.id, at(2000))

    expect(await db.minutes.get(a!.id)).toMatchObject({ deleted: true, dirty: 1 })
    const rows = await listMinutes(db)
    expect(rows).toHaveLength(1)
    expect(totalMinutes(rows)).toBe(40)
  })

  it('does nothing for an unknown id', async () => {
    await removeMinutes(db, 'nope', noon)
    expect(await db.minutes.count()).toBe(0)
  })
})

describe('addReviewTime', () => {
  it('writes nothing until a whole minute has built up', async () => {
    const clock = await addReviewTime(db, undefined, 20_000, noon)
    expect(clock.ms).toBe(20_000)
    expect(await db.minutes.count()).toBe(0)
  })

  it('keeps one row per sitting and updates it as time adds up', async () => {
    let clock = await addReviewTime(db, undefined, 40_000, noon)
    clock = await addReviewTime(db, clock, 40_000, at(1000)) // 80 s → 1 min
    const first = await db.minutes.get(clock.id)
    expect(first).toMatchObject({ minutes: 1, source: 'review', day: '2026-11-07', dirty: 1 })

    for (let i = 0; i < 3; i++) clock = await addReviewTime(db, clock, 60_000, at(2000 + i))
    expect(await db.minutes.count()).toBe(1)
    expect((await db.minutes.get(clock.id))?.minutes).toBe(4) // 260 s
  })

  it('does not rewrite the row when the minute count is unchanged', async () => {
    let clock = await addReviewTime(db, undefined, 60_000, noon)
    const before = await db.minutes.get(clock.id)
    await db.minutes.update(clock.id, { dirty: 0 })
    clock = await addReviewTime(db, clock, 5_000, at(1000))
    expect(await db.minutes.get(clock.id)).toEqual({ ...before, dirty: 0 })
  })

  it('caps a card left open at the idle limit', async () => {
    const clock = await addReviewTime(db, undefined, 30 * 60_000, noon)
    expect(clock.ms).toBe(60_000)
    expect((await db.minutes.get(clock.id))?.minutes).toBe(1)
  })

  it('keeps separate rows from manual entries, so neither is double counted', async () => {
    await addMinutes(db, 20, noon)
    const clock = await addReviewTime(db, undefined, 60_000, at(1000))
    const rows = await listMinutes(db)
    expect(rows.map((r) => r.source).sort()).toEqual(['manual', 'review'])
    expect(totalMinutes(rows)).toBe(21)
    expect(clock.id).not.toBe(rows.find((r) => r.source === 'manual')?.id)
  })

  it('starts a new row when the sitting crosses the rollover', async () => {
    // 03:50 and 04:10 Manila on the 8th: study day 7th, then the 8th
    const late = new Date('2026-11-07T19:50:00Z')
    const early = new Date('2026-11-07T20:10:00Z')
    let clock = await addReviewTime(db, undefined, 60_000, late)
    const firstId = clock.id
    clock = await addReviewTime(db, clock, 60_000, early)

    expect(clock.id).not.toBe(firstId)
    expect(clock).toMatchObject({ day: '2026-11-08', ms: 60_000 })
    const days = (await db.minutes.toArray()).map((r) => r.day).sort()
    expect(days).toEqual(['2026-11-07', '2026-11-08'])
  })
})
