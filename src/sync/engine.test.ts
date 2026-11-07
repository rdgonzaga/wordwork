import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addCard, deleteCard, updateCard } from '../db/cards.ts'
import { getSyncMeta } from '../db/meta.ts'
import { createDb, type Review, type WordworkDb } from '../db/schema.ts'
import { updateSettings } from '../db/settings.ts'
import { rateCard } from '../db/srs.ts'
import { runSync } from './engine.ts'
import { FakeServer } from './fakeServer.ts'
import { RemoteError } from './remote.ts'

const USER = 'user-1'
const t0 = new Date('2026-11-07T05:00:00Z')
const at = (ms: number) => new Date(t0.getTime() + ms)
const input = { term: 'Haus', translation: 'house', extra: { article: 'das' }, tags: [] }

let n = 0
let dbs: WordworkDb[] = []
let server: FakeServer

function device(): WordworkDb {
  const db = createDb(`sync-test-${n++}`)
  dbs.push(db)
  return db
}

beforeEach(() => {
  server = new FakeServer()
  dbs = []
})

afterEach(async () => {
  await Promise.all(dbs.map((d) => d.delete()))
})

const sync = (db: WordworkDb) => runSync(db, server, USER)

describe('push', () => {
  it('sends dirty rows as snake_case and clears dirty', async () => {
    const a = device()
    const card = await addCard(a, 'deck-1', input, t0)
    const res = await sync(a)
    expect(res).toMatchObject({ pushed: 1, failed: [] })
    expect(server.row('cards', card.id)).toMatchObject({
      deck_id: 'deck-1',
      term: 'Haus',
      example: null,
      new_order: 0,
      updated_at: t0.getTime(),
      deleted: false,
    })
    expect(server.row('cards', card.id)).not.toHaveProperty('dirty')
    expect((await a.cards.get(card.id))?.dirty).toBe(0)
  })

  it('does not resend clean rows', async () => {
    const a = device()
    await addCard(a, 'deck-1', input, t0)
    await sync(a)
    server.upsertCalls = []
    await sync(a)
    expect(server.upsertCalls).toEqual([])
  })

  it('keeps a row dirty if it was edited while the push was in flight', async () => {
    const a = device()
    const card = await addCard(a, 'deck-1', input, t0)
    server.onUpsert = async () => {
      server.onUpsert = null
      await updateCard(a, card.id, { ...input, translation: 'home' }, at(1000))
    }
    await sync(a)
    expect(await a.cards.get(card.id)).toMatchObject({ translation: 'home', dirty: 1 })
    await sync(a)
    expect(server.row('cards', card.id)).toMatchObject({ translation: 'home' })
    expect((await a.cards.get(card.id))?.dirty).toBe(0)
  })

  it('pushes the settings row, which has no dirty index', async () => {
    const a = device()
    await updateSettings(a, { newPerDay: 5 }, t0)
    await sync(a)
    expect(server.row('settings', 'me')).toMatchObject({ new_per_day: 5, time_zone: 'Asia/Manila' })
  })

  it('aborts on a network error and leaves rows dirty', async () => {
    const a = device()
    const card = await addCard(a, 'deck-1', input, t0)
    server.failWith = new RemoteError('Failed to fetch')
    await expect(sync(a)).rejects.toThrow('Failed to fetch')
    expect((await a.cards.get(card.id))?.dirty).toBe(1)
    server.failWith = null
    await sync(a)
    expect(server.row('cards', card.id)).toBeDefined()
  })

  it('falls back to row-by-row on a constraint error, so one bad row cannot block the rest', async () => {
    const a = device()
    const good1 = await addCard(a, 'deck-1', input, t0)
    const bad = await addCard(a, 'deck-1', { ...input, term: 'BAD' }, t0)
    const good2 = await addCard(a, 'deck-1', { ...input, term: 'Baum' }, t0)
    server.rejectRow = (_t, row) => row.term === 'BAD'

    const res = await sync(a)
    expect(res.pushed).toBe(2)
    expect(res.failed).toEqual([
      { table: 'cards', id: bad.id, message: 'violates check constraint' },
    ])
    expect(server.row('cards', good1.id)).toBeDefined()
    expect(server.row('cards', good2.id)).toBeDefined()
    expect(server.row('cards', bad.id)).toBeUndefined()
    expect((await a.cards.get(bad.id))?.dirty).toBe(1)
    expect((await a.cards.get(good1.id))?.dirty).toBe(0)
  })

  it('treats a bad-value error (class 22) as a per-row failure too', async () => {
    const a = device()
    const good = await addCard(a, 'deck-1', input, t0)
    const bad = await addCard(a, 'deck-1', { ...input, term: 'BAD' }, t0)
    server.rejectRow = (_t, row) => row.term === 'BAD'
    server.rejectCode = '22P02'
    const res = await sync(a)
    expect(res.failed.map((f) => f.id)).toEqual([bad.id])
    expect(server.row('cards', good.id)).toBeDefined()
  })

  it('a device with a slow clock still wins its edit, because updatedAt only moves forward', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, at(0))
    await sync(a)
    await sync(b)
    await updateCard(b, card.id, { ...input, translation: 'home' }, at(-60_000))
    expect((await b.cards.get(card.id))?.updatedAt).toBe(at(0).getTime() + 1)
    await sync(b)
    await sync(a)
    expect((await a.cards.get(card.id))?.translation).toBe('home')
  })

  it('leaves a row dirty when the server drops it as stale, then takes the newer server row', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, at(0))
    await sync(a)
    // A edits and pushes; B never pulled, so its edit below is older than what the server holds.
    await updateCard(a, card.id, { ...input, translation: 'from A' }, at(9000))
    await sync(a)
    await b.cards.put({
      ...(await a.cards.get(card.id))!,
      translation: 'from B',
      updatedAt: at(100).getTime(),
      dirty: 1,
    })

    const res = await sync(b)
    expect(res.pushed).toBe(0)
    expect(server.row('cards', card.id)?.translation).toBe('from A')
    expect(await b.cards.get(card.id)).toMatchObject({ translation: 'from A', dirty: 0 })
  })
})

describe('pull', () => {
  it('shows edits from one device on another', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    await sync(a)
    await sync(b)
    expect(await b.cards.get(card.id)).toMatchObject({ term: 'Haus', dirty: 0 })

    await updateCard(a, card.id, { ...input, translation: 'home' }, at(5000))
    await sync(a)
    await sync(b)
    expect((await b.cards.get(card.id))?.translation).toBe('home')
  })

  it('propagates deletes as tombstones', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    await sync(a)
    await sync(b)
    await deleteCard(b, card.id, at(5000))
    await sync(b)
    await sync(a)
    expect(await a.cards.get(card.id)).toMatchObject({ deleted: true, dirty: 0 })
  })

  it('clears an optional field on the other device', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', { ...input, example: 'Das Haus ist groß.' }, t0)
    await sync(a)
    await sync(b)
    expect((await b.cards.get(card.id))?.example).toBe('Das Haus ist groß.')
    await updateCard(a, card.id, { ...input, example: '' }, at(5000))
    await sync(a)
    await sync(b)
    expect((await b.cards.get(card.id))?.example).toBeUndefined()
  })

  it('keeps an unpushed local edit that is newer than the server row', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    await sync(a)
    await sync(b)
    await updateCard(a, card.id, { ...input, translation: 'from A' }, at(1000))
    await sync(a)
    await updateCard(b, card.id, { ...input, translation: 'from B' }, at(2000))
    // B pulls A's older edit first, but its own newer edit is dirty and must survive.
    await sync(b)
    expect((await b.cards.get(card.id))?.translation).toBe('from B')
    await sync(a)
    expect((await a.cards.get(card.id))?.translation).toBe('from B')
  })

  it('lets a newer server row replace an older unpushed local edit', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    await sync(a)
    await sync(b)
    await updateCard(b, card.id, { ...input, translation: 'old B' }, at(1000))
    await updateCard(a, card.id, { ...input, translation: 'new A' }, at(2000))
    await sync(a)
    await sync(b)
    expect((await b.cards.get(card.id))?.translation).toBe('new A')
    expect(server.row('cards', card.id)?.translation).toBe('new A')
  })

  it('keeps reviews from two offline devices', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    await sync(a)
    await sync(b)
    await rateCard(a, card.id, 3, at(1000), 900)
    await rateCard(b, card.id, 4, at(2000), 800)
    await sync(a)
    await sync(b)
    await sync(a)
    for (const d of [a, b]) {
      const ratings = (await d.reviews.toArray()).map((r: Review) => r.rating).sort()
      expect(ratings).toEqual([3, 4])
    }
  })

  it('syncs an undone review as a tombstone', async () => {
    const a = device()
    const b = device()
    const card = await addCard(a, 'deck-1', input, t0)
    const { review } = await rateCard(a, card.id, 3, at(1000), 900)
    await sync(a)
    await sync(b)
    const { undoReview } = await import('../db/srs.ts')
    await undoReview(a, review.id, at(2000))
    await sync(a)
    await sync(b)
    expect(await b.reviews.get(review.id)).toMatchObject({ deleted: true, rating: 3 })
  })

  it('takes the server review on an equal stamp, since the server keeps immutable columns', async () => {
    const a = device()
    const card = await addCard(a, 'deck-1', input, t0)
    const { review } = await rateCard(a, card.id, 3, at(1000), 900)
    await sync(a)
    // Local copy differs (rating 4) with the same updatedAt and is dirty; its push is rejected,
    // so only the pull can resolve it.
    await a.reviews.update(review.id, { rating: 4, dirty: 1 })
    server.rejectRow = (table) => table === 'reviews'
    server.tables.get('reviews')!.get(review.id)!.server_seq = ++server.seq

    const res = await sync(a)
    expect(res.failed).toHaveLength(1)
    expect(await a.reviews.get(review.id)).toMatchObject({ rating: 3, dirty: 0 })
  })

  it('pulls settings onto a device that has none', async () => {
    const a = device()
    const b = device()
    await updateSettings(a, { newPerDay: 5, rolloverHour: 3 }, t0)
    await sync(a)
    await sync(b)
    expect(await b.settings.get('me')).toMatchObject({ newPerDay: 5, rolloverHour: 3, dirty: 0 })
  })

  it('pulls a page of exactly the page size without looping forever', async () => {
    const a = device()
    const b = device()
    await a.decks.bulkAdd(
      Array.from({ length: 500 }, (_, i) => ({
        id: `d${i}`,
        language: 'de',
        name: `Deck ${i}`,
        createdAt: 1,
        updatedAt: i + 1,
        deleted: false,
        dirty: 1 as const,
      })),
    )
    await sync(a)
    expect((await sync(b)).pulled).toBe(500)
    expect(await b.decks.count()).toBe(500)
  })

  it('pulls in pages and remembers a cursor per table', async () => {
    const a = device()
    const b = device()
    const rows = Array.from({ length: 1100 }, (_, i) => ({
      id: `r${i}`,
      cardId: 'c',
      rating: 3 as const,
      reviewedAt: i,
      day: '2026-11-07',
      durationMs: 1,
      deviceId: 'd',
      updatedAt: i,
      deleted: false,
      dirty: 1 as const,
    }))
    await a.reviews.bulkAdd(rows)
    await addCard(a, 'deck-1', input, t0)
    await sync(a)

    const res = await sync(b)
    expect(res.pulled).toBe(1101)
    expect(await b.reviews.count()).toBe(1100)
    const meta = await getSyncMeta(b)
    expect(meta.cursors.reviews).toBeGreaterThan(0)
    expect(meta.cursors.cards).toBeGreaterThan(0)

    const again = await sync(b)
    expect(again.pulled).toBe(0)
  })

  it('does not advance the cursor when the pull fails', async () => {
    const a = device()
    const b = device()
    await addCard(a, 'deck-1', input, t0)
    await sync(a)
    server.failWith = new RemoteError('Failed to fetch')
    await expect(sync(b)).rejects.toThrow()
    expect((await getSyncMeta(b)).cursors).toEqual({})
    server.failWith = null
    await sync(b)
    expect((await getSyncMeta(b)).cursors.cards).toBe(server.seq)
  })
})

describe('account', () => {
  it('refuses to sync a database that belongs to another account', async () => {
    const a = device()
    await sync(a)
    await expect(runSync(a, server, 'someone-else')).rejects.toThrow('different account')
  })
})
