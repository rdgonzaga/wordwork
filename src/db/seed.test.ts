import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { languages } from '../languages/index.ts'
import { createDb, type WordworkDb } from './schema.ts'
import { seedStarterDecks } from './seed.ts'

const now = new Date('2026-11-07T05:00:00Z')
const deck = languages.find((l) => l.code === 'de')!.seed!

let db: WordworkDb
let n = 0

beforeEach(() => {
  db = createDb(`seed-test-${n++}`)
})

afterEach(async () => {
  await db.delete()
})

describe('German starter deck', () => {
  it('has the starter words plus the A1 topics, with unique terms', () => {
    expect(deck.cards.length).toBeGreaterThanOrEqual(300)
    expect(new Set(deck.cards.map((c) => c.term)).size).toBe(deck.cards.length)
  })

  it('files every card under a lesson', () => {
    for (const c of deck.cards) expect(c.source ?? deck.source, c.term).toBeTruthy()
    const topics = new Set(deck.cards.map((c) => c.source).filter(Boolean))
    expect(topics.size).toBeGreaterThanOrEqual(10)
  })

  it('gives every noun an article', () => {
    const nouns = deck.cards.filter((c) => c.tags.includes('noun'))
    expect(nouns.length).toBeGreaterThan(30)
    for (const c of nouns) expect(c.extra.article, c.term).toMatch(/^(der|die|das)$/)
  })
})

describe('seedStarterDecks', () => {
  it('seeds a deck and its cards on first run', async () => {
    await seedStarterDecks(db, now)

    const decks = await db.decks.toArray()
    expect(decks).toHaveLength(1)
    expect(decks[0]).toMatchObject({ language: 'de', name: deck.name, deleted: false })
    expect(await db.cards.where('deckId').equals(decks[0].id).count()).toBe(deck.cards.length)
  })

  it('makes the same ids on every device', async () => {
    await seedStarterDecks(db, now)
    const other = createDb(`seed-test-${n++}`)
    await seedStarterDecks(other, new Date('2026-12-01T00:00:00Z'))

    const ids = async (d: WordworkDb) => (await d.cards.toCollection().primaryKeys()).sort()
    expect(await ids(other)).toEqual(await ids(db))
    await other.delete()
  })

  it('writes ids as UUIDs so they fit a uuid column', async () => {
    await seedStarterDecks(db, now)
    const card = await db.cards.toCollection().first()
    expect(card!.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('leaves seeded rows clean and older than any real edit', async () => {
    await seedStarterDecks(db, now)
    const card = await db.cards.toCollection().first()
    expect(card).toMatchObject({ dirty: 0, updatedAt: 0, createdAt: now.getTime() })
  })

  it('tags each card with its topic, falling back to the deck source', async () => {
    await seedStarterDecks(db, now)
    const sources = new Set((await db.cards.toArray()).map((c) => c.source))
    expect(sources).toContain(deck.source)
    expect(sources).toContain('A1 · Verbs')
  })

  it('adds cards that an older release did not have', async () => {
    await seedStarterDecks(db, now)
    const all = await db.cards.toArray()
    const missing = all.slice(-40)
    await db.cards.bulkDelete(missing.map((c) => c.id))

    await seedStarterDecks(db, now)
    expect(await db.cards.count()).toBe(all.length)
  })

  it('never brings back a deleted deck or its cards', async () => {
    await seedStarterDecks(db, now)
    const [d] = await db.decks.toArray()
    await db.decks.update(d.id, { deleted: true })
    await db.cards.clear()

    await seedStarterDecks(db, now)
    expect(await db.cards.count()).toBe(0)
  })

  it('never brings back a deleted card', async () => {
    await seedStarterDecks(db, now)
    const [card] = await db.cards.toArray()
    await db.cards.update(card.id, { deleted: true })

    await seedStarterDecks(db, now)
    expect((await db.cards.get(card.id))!.deleted).toBe(true)
    expect(await db.cards.count()).toBe(deck.cards.length)
  })

  it('never overwrites an edited card', async () => {
    await seedStarterDecks(db, now)
    const [card] = await db.cards.toArray()
    await db.cards.update(card.id, { translation: 'edited', updatedAt: 5, dirty: 1 })

    await seedStarterDecks(db, now)
    expect(await db.cards.get(card.id)).toMatchObject({
      translation: 'edited',
      updatedAt: 5,
      dirty: 1,
    })
  })
})
