import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { listSentences, listSongs, saveSentence, saveSong } from './journal'
import { createDb, type WordworkDb } from './schema'

let db: WordworkDb
const t = (ms: number) => new Date(ms)

beforeEach(() => {
  db = createDb(`journal-${Math.random()}`)
})

describe('saveSentence', () => {
  it('writes one row per day and language, marked dirty', async () => {
    await saveSentence(db, '2026-11-07', 'de', ' Ich lerne Deutsch. ', t(1_000))
    const rows = await db.diary.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: '2026-11-07:de',
      day: '2026-11-07',
      language: 'de',
      text: 'Ich lerne Deutsch.',
      deleted: false,
      dirty: 1,
    })
  })

  it('edits the same row and moves updatedAt forward even if the clock is behind', async () => {
    await saveSentence(db, '2026-11-07', 'de', 'eins', t(5_000))
    await saveSentence(db, '2026-11-07', 'de', 'zwei', t(1_000))
    const rows = await db.diary.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].text).toBe('zwei')
    expect(rows[0].updatedAt).toBeGreaterThan(5_000)
  })

  it('leaves an unchanged entry alone', async () => {
    await saveSentence(db, '2026-11-07', 'de', 'eins', t(1_000))
    await db.diary.update('2026-11-07:de', { dirty: 0 })
    await saveSentence(db, '2026-11-07', 'de', 'eins', t(2_000))
    expect((await db.diary.get('2026-11-07:de'))?.dirty).toBe(0)
  })

  it('tombstones the entry when the text is cleared, and revives it on the next write', async () => {
    await saveSentence(db, '2026-11-07', 'de', 'eins', t(1_000))
    await saveSentence(db, '2026-11-07', 'de', '   ', t(2_000))
    expect(await db.diary.get('2026-11-07:de')).toMatchObject({ deleted: true, dirty: 1 })
    expect(await listSentences(db, 'de')).toEqual([])

    await saveSentence(db, '2026-11-07', 'de', 'drei', t(3_000))
    expect(await db.diary.get('2026-11-07:de')).toMatchObject({ deleted: false, text: 'drei' })
  })

  it('writes nothing for blank text with no entry', async () => {
    await saveSentence(db, '2026-11-07', 'de', '', t(1_000))
    expect(await db.diary.count()).toBe(0)
  })

  it('caps the length at what the server accepts', async () => {
    await saveSentence(db, '2026-11-07', 'de', 'x'.repeat(5_000), t(1_000))
    expect((await db.diary.get('2026-11-07:de'))?.text).toHaveLength(1_000)
  })
})

describe('listSentences', () => {
  it('lists one language, newest day first, without deleted entries', async () => {
    await saveSentence(db, '2026-11-05', 'de', 'a', t(1))
    await saveSentence(db, '2026-11-07', 'de', 'b', t(2))
    await saveSentence(db, '2026-11-06', 'it', 'c', t(3))
    await saveSentence(db, '2026-11-06', 'de', 'd', t(4))
    await saveSentence(db, '2026-11-06', 'de', '', t(5))
    expect((await listSentences(db, 'de')).map((r) => r.day)).toEqual(['2026-11-07', '2026-11-05'])
  })
})

describe('saveSong', () => {
  it('keys the song to the Monday of the week', async () => {
    // 2026-11-07 is a Saturday.
    await saveSong(db, 'de', '2026-11-07', { title: 'Atemlos', artist: 'Helene Fischer' }, t(1_000))
    const rows = await db.songs.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: '2026-11-02:de',
      weekOf: '2026-11-02',
      title: 'Atemlos',
      artist: 'Helene Fischer',
      notes: '',
      deleted: false,
      dirty: 1,
    })
  })

  it('edits the week’s song instead of adding a second', async () => {
    await saveSong(db, 'de', '2026-11-03', { title: 'A', artist: 'X' }, t(1_000))
    await saveSong(db, 'de', '2026-11-08', { title: 'B', artist: 'X' }, t(2_000))
    const rows = await db.songs.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('B')
  })

  it('stores only safe links', async () => {
    await saveSong(
      db,
      'de',
      '2026-11-03',
      { title: 'A', artist: 'X', url: 'javascript:alert(1)' },
      t(1),
    )
    expect((await db.songs.toArray())[0].url).toBeUndefined()
    await saveSong(
      db,
      'de',
      '2026-11-03',
      { title: 'A', artist: 'X', url: 'https://youtu.be/x' },
      t(2),
    )
    expect((await db.songs.toArray())[0].url).toBe('https://youtu.be/x')
  })

  it('removes the song when the title is blank', async () => {
    await saveSong(db, 'de', '2026-11-03', { title: 'A', artist: 'X' }, t(1))
    await saveSong(db, 'de', '2026-11-03', { title: ' ', artist: 'X' }, t(2))
    expect(await listSongs(db, 'de')).toEqual([])
    expect(await db.songs.get('2026-11-02:de')).toMatchObject({ deleted: true, dirty: 1 })
  })
})

describe('listSongs', () => {
  it('lists newest week first for one language', async () => {
    await saveSong(db, 'de', '2026-10-20', { title: 'old', artist: 'X' }, t(1))
    await saveSong(db, 'de', '2026-11-03', { title: 'new', artist: 'X' }, t(2))
    await saveSong(db, 'it', '2026-11-03', { title: 'other', artist: 'X' }, t(3))
    expect((await listSongs(db, 'de')).map((s) => s.title)).toEqual(['new', 'old'])
  })
})
