import type { Card, WordworkDb } from './schema.ts'

export type CardInput = Pick<
  Card,
  'term' | 'translation' | 'example' | 'exampleTranslation' | 'extra' | 'tags'
>

/** Drops empty extra fields so blank selects don't get stored. */
function clean(input: CardInput): CardInput {
  const extra = Object.fromEntries(Object.entries(input.extra).filter(([, v]) => v.trim() !== ''))
  return {
    ...input,
    term: input.term.trim(),
    translation: input.translation.trim(),
    example: input.example?.trim() || undefined,
    exampleTranslation: input.exampleTranslation?.trim() || undefined,
    extra,
  }
}

export async function addCard(
  db: WordworkDb,
  deckId: string,
  input: CardInput,
  now: Date,
): Promise<Card> {
  return db.transaction('rw', db.cards, async () => {
    const last = await db.cards
      .where('[deckId+newOrder]')
      .between([deckId, 0], [deckId, Infinity])
      .last()
    const card: Card = {
      ...clean(input),
      id: crypto.randomUUID(),
      deckId,
      newOrder: (last?.newOrder ?? -1) + 1,
      suspended: false,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
      deleted: false,
      dirty: 1,
    }
    await db.cards.add(card)
    return card
  })
}

export async function updateCard(
  db: WordworkDb,
  id: string,
  input: CardInput,
  now: Date,
): Promise<void> {
  await db.cards.update(id, { ...clean(input), updatedAt: now.getTime(), dirty: 1 })
}

/** Tombstone, so the deletion can sync. Review history stays. */
export async function deleteCard(db: WordworkDb, id: string, now: Date): Promise<void> {
  await db.cards.update(id, { deleted: true, updatedAt: now.getTime(), dirty: 1 })
}
