import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb, type WordworkDb } from './schema'
import { DEFAULT_SETTINGS, getSettings, updateSettings } from './settings'

let db: WordworkDb
let n = 0

beforeEach(() => {
  db = createDb(`test-${n++}`)
})

afterEach(async () => {
  await db.delete()
})

describe('schema', () => {
  it('opens with every table from the plan', async () => {
    await db.open()
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      [
        'cards',
        'decks',
        'diary',
        'minutes',
        'reviews',
        'schedules',
        'settings',
        'songs',
        'syncMeta',
      ].sort(),
    )
  })
})

describe('settings', () => {
  it('returns the defaults before anything is saved', async () => {
    const s = await getSettings(db)
    expect(s).toMatchObject({
      newPerDay: 10,
      maxReviewsPerDay: 100,
      goalHours: 400,
      streakMinutes: 10,
      timeZone: 'Asia/Manila',
      rolloverHour: 4,
    })
    expect(await db.settings.count()).toBe(0)
  })

  it('saves a partial update over the defaults and marks it dirty', async () => {
    const now = new Date('2026-11-07T05:00:00Z')
    await updateSettings(db, { newPerDay: 20 }, now)

    const s = await getSettings(db)
    expect(s.newPerDay).toBe(20)
    expect(s.maxReviewsPerDay).toBe(DEFAULT_SETTINGS.maxReviewsPerDay)
    expect(s.updatedAt).toBe(now.getTime())
    expect(s.dirty).toBe(1)
  })

  it('keeps earlier changes on a later update', async () => {
    await updateSettings(db, { newPerDay: 20 }, new Date('2026-11-07T05:00:00Z'))
    await updateSettings(db, { rolloverHour: 3 }, new Date('2026-11-07T06:00:00Z'))

    const s = await getSettings(db)
    expect(s).toMatchObject({ newPerDay: 20, rolloverHour: 3 })
  })
})
