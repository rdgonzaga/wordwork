import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addCard, deleteCard, updateCard } from './cards.ts'
import { createDb, type WordworkDb } from './schema.ts'

const now = new Date('2026-11-07T05:00:00Z')
let db: WordworkDb
let n = 0

beforeEach(() => {
  db = createDb(`cards-test-${n++}`)
})

afterEach(async () => {
  await db.delete()
})

const base = {
  term: ' Haus ',
  translation: 'house',
  extra: { article: 'das', plural: '' },
  tags: [],
}

describe('cards', () => {
  it('adds a trimmed, dirty card at the end of the new order', async () => {
    const a = await addCard(db, 'd', base, now)
    const b = await addCard(db, 'd', { ...base, term: 'Baum' }, now)
    expect(a).toMatchObject({ term: 'Haus', newOrder: 0, dirty: 1, deleted: false })
    expect(a.extra).toEqual({ article: 'das' })
    expect(b.newOrder).toBe(1)
  })

  it('updates and marks dirty', async () => {
    const a = await addCard(db, 'd', base, now)
    await updateCard(db, a.id, { ...base, translation: 'home' }, new Date(now.getTime() + 1))
    expect(await db.cards.get(a.id)).toMatchObject({ translation: 'home', dirty: 1 })
  })

  it('deletes as a tombstone', async () => {
    const a = await addCard(db, 'd', base, now)
    await deleteCard(db, a.id, now)
    expect(await db.cards.get(a.id)).toMatchObject({ deleted: true, dirty: 1 })
  })
})
