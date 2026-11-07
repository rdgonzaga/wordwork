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
  it('has around 90 cards with unique terms', () => {
    expect(deck.cards.length).toBeGreaterThanOrEqual(85)
    expect(new Set(deck.cards.map((c) => c.term)).size).toBe(deck.cards.length)
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

  it('does nothing once any deck exists, even a deleted one', async () => {
    await seedStarterDecks(db, now)
    const [d] = await db.decks.toArray()
    await db.decks.update(d.id, { deleted: true })
    await db.cards.clear()

    await seedStarterDecks(db, now)
    expect(await db.cards.count()).toBe(0)
  })
})
