import { languages } from '../languages/index.ts'
import type { Card, Deck, WordworkDb } from './schema.ts'

/** Name-based UUID (v5 layout, SHA-1), so every device derives the same id for the same seed row. */
export async function nameUuid(name: string): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`wordwork:${name}`)),
  )
  const b = hash.slice(0, 16)
  b[6] = (b[6] & 0x0f) | 0x50
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Seeds each language's starter deck if the database has no decks at all (deleted ones count,
 * so a removed starter deck stays removed). Seeded rows have `updatedAt: 0` and `dirty: 0`:
 * every device seeds its own copy, and any real edit wins last-write-wins.
 */
export async function seedStarterDecks(db: WordworkDb, now: Date): Promise<void> {
  const decks: Deck[] = []
  const cards: Card[] = []
  const createdAt = now.getTime()

  for (const lang of languages) {
    if (!lang.seed) continue
    const { key, name, source } = lang.seed
    const deckId = await nameUuid(`deck:${key}`)
    decks.push({
      id: deckId,
      language: lang.code,
      name,
      createdAt,
      updatedAt: 0,
      deleted: false,
      dirty: 0,
    })

    for (const [i, c] of lang.seed.cards.entries()) {
      cards.push({
        ...c,
        id: await nameUuid(`card:${key}:${c.term}`),
        deckId,
        source,
        newOrder: i,
        suspended: false,
        createdAt,
        updatedAt: 0,
        deleted: false,
        dirty: 0,
      })
    }
  }

  await db.transaction('rw', db.decks, db.cards, async () => {
    if ((await db.decks.count()) > 0) return
    await db.decks.bulkPut(decks)
    await db.cards.bulkPut(cards)
  })
}
