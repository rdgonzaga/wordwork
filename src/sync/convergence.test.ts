import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addCard } from '../db/cards.ts'
import { createDb, type Rating, type Schedule, type WordworkDb } from '../db/schema.ts'
import { getSettings } from '../db/settings.ts'
import { rateCard, undoReview } from '../db/srs.ts'
import { replay } from '../domain/srs/scheduler.ts'
import { runSync } from './engine.ts'
import { FakeServer } from './fakeServer.ts'
import type { Remote } from './remote.ts'

const USER = 'user-1'
const t0 = new Date('2026-11-07T05:00:00Z')
const at = (ms: number) => new Date(t0.getTime() + ms)
const HOUR = 3_600_000
const input = { term: 'Haus', translation: 'house', extra: { article: 'das' }, tags: [] }

let n = 0
let dbs: WordworkDb[] = []
let server: FakeServer

const device = () => {
  const db = createDb(`converge-test-${n++}`)
  dbs.push(db)
  return db
}
const sync = (db: WordworkDb) => runSync(db, server, USER)

beforeEach(() => {
  server = new FakeServer()
  dbs = []
})

afterEach(async () => {
  await Promise.all(dbs.map((d) => d.delete()))
})

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function cached(db: WordworkDb, cardId: string): Promise<Schedule | undefined> {
  return db.schedules.get(cardId)
}

async function expected(db: WordworkDb, cardId: string): Promise<Schedule> {
  const settings = await getSettings(db)
  return replay(cardId, await db.reviews.toArray(), settings)
}

describe('two devices reviewing offline', () => {
  it('converge to the same schedule', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    await sync(a)
    await sync(b)

    await rateCard(a, card.id, 3, at(1000), 900)
    await rateCard(b, card.id, 4, at(2000), 800)
    await rateCard(a, card.id, 3, at(3000), 700)
    await sync(a)
    await sync(b)
    await sync(a)

    const want = await expected(a, card.id)
    expect(want.reps).toBe(3)
    expect(await cached(a, card.id)).toEqual(want)
    expect(await cached(b, card.id)).toEqual(want)
  })

  it('rebuilds the cache from reviews pulled in, even when the device never rated the card', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    await rateCard(a, card.id, 4, at(1000), 900)
    await sync(a)
    await sync(b)
    expect(await cached(b, card.id)).toEqual(await expected(b, card.id))
    expect((await cached(b, card.id))?.state).toBe('review')
  })

  it('carries an undo from one device to the other', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    await rateCard(a, card.id, 3, at(1000), 900)
    const { review } = await rateCard(a, card.id, 3, at(2000), 900)
    await sync(a)
    await sync(b)
    expect((await cached(b, card.id))?.state).toBe('review')

    await undoReview(a, review.id, at(3000))
    await sync(a)
    await sync(b)

    const want = await expected(b, card.id)
    expect(want.reps).toBe(1)
    expect(await cached(b, card.id)).toEqual(want)
    expect(await cached(a, card.id)).toEqual(want)
  })

  it('drops the cached schedule when the last review is undone elsewhere', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    const { review } = await rateCard(a, card.id, 3, at(1000), 900)
    await sync(a)
    await sync(b)
    expect(await cached(b, card.id)).toBeDefined()

    await undoReview(a, review.id, at(2000))
    await sync(a)
    await sync(b)
    expect(await cached(b, card.id)).toBeUndefined()
  })

  it('keep the cache right when a sync dies after the reviews page', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    await rateCard(a, card.id, 4, at(1000), 900)
    await sync(a)

    const dropsMinutes: Remote = {
      upsert: (t, rows) => server.upsert(t, rows),
      pull: (t, after, limit) =>
        t === 'minutes' ? Promise.reject(new Error('offline')) : server.pull(t, after, limit),
    }
    await expect(runSync(b, dropsMinutes, USER)).rejects.toThrow('offline')
    expect(await cached(b, card.id)).toEqual(await expected(b, card.id))
    expect((await cached(b, card.id))?.state).toBe('review')
  })

  it('end up identical whatever the review pattern and sync order (seeded)', async () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rand = rng(seed)
      server = new FakeServer()
      const devs = [device(), device(), device()]
      const cardIds: string[] = []
      for (let i = 0; i < 3; i++) {
        cardIds.push((await addCard(devs[0], 'deck-1', { ...input, term: `w${i}` }, t0)).id)
      }
      for (const d of devs) await sync(d)

      let clock = HOUR
      for (let step = 0; step < 14; step++) {
        const d = devs[Math.floor(rand() * devs.length)]
        const cardId = cardIds[Math.floor(rand() * cardIds.length)]
        clock += Math.floor(rand() * 40 * HOUR) + 1000
        const rating = (Math.floor(rand() * 4) + 1) as Rating
        const { review } = await rateCard(d, cardId, rating, at(clock), 500)
        if (rand() < 0.15) await undoReview(d, review.id, at(clock + 500))
        if (rand() < 0.3) await sync(d)
      }

      const order = [...devs, ...devs].sort(() => rand() - 0.5)
      for (const d of order) await sync(d)
      for (const d of devs) await sync(d)

      for (const cardId of cardIds) {
        const want = await expected(devs[0], cardId)
        for (const d of devs) {
          const got = await cached(d, cardId)
          if (want.reps === 0) expect(got).toBeUndefined()
          else expect(got, `seed ${seed}`).toEqual(want)
        }
      }
    }
  })
})
