import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { addCard } from '../db/cards'
import { saveSentence, saveSong } from '../db/journal'
import { addMinutes } from '../db/minutes'
import { SYNC_TABLES, createDb, type WordworkDb } from '../db/schema'
import { updateSettings } from '../db/settings'
import { buildExport, exportFileName, parseExport, type ExportFile } from './format'
import { importData } from './importer'

const t = (ms: number) => new Date(ms)
let n = 0
const fresh = () => createDb(`io-${n++}-${Math.random()}`)

async function populate(db: WordworkDb) {
  await db.decks.put({
    id: 'deck1',
    language: 'de',
    name: 'A1',
    createdAt: 1,
    updatedAt: 1,
    deleted: false,
    dirty: 1,
  })
  await addCard(
    db,
    'deck1',
    { term: 'Haus', translation: 'house', extra: { article: 'das' }, tags: [] },
    t(10),
  )
  await addMinutes(db, 25, t(20))
  await saveSentence(db, '2026-11-07', 'de', 'Das Haus ist groß.', t(30))
  await saveSong(db, 'de', '2026-11-07', { title: 'Atemlos', artist: 'Helene Fischer' }, t(40))
  await updateSettings(db, { goalHours: 300 }, t(50))
  await db.reviews.put({
    id: 'r1',
    cardId: (await db.cards.toArray())[0].id,
    rating: 3,
    reviewedAt: 100,
    day: '2026-11-07',
    durationMs: 4_000,
    deviceId: 'dev',
    updatedAt: 100,
    deleted: false,
    dirty: 1,
  })
}

async function snapshot(db: WordworkDb) {
  const out: Record<string, unknown[]> = {}
  for (const table of SYNC_TABLES) {
    const rows = await db.table(table).toArray()
    out[table] = rows
      .map((row) => {
        const copy = { ...row }
        delete copy.dirty
        return copy
      })
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
  }
  return out
}

function parsed(file: ExportFile): ExportFile {
  const result = parseExport(JSON.stringify(file))
  if (!result.ok) throw new Error(result.error)
  return result.data
}

let a: WordworkDb
let b: WordworkDb
beforeEach(() => {
  a = fresh()
  b = fresh()
})

describe('export then import', () => {
  it('restores everything into an empty database', async () => {
    await populate(a)
    const file = parsed(await buildExport(a, t(1_000)))
    await importData(b, file, 'merge', t(2_000))
    expect(await snapshot(b)).toEqual(await snapshot(a))
  })

  it('leaves imported rows dirty so they sync, and rebuilds schedules', async () => {
    await populate(a)
    await importData(b, parsed(await buildExport(a, t(1_000))), 'merge', t(2_000))
    for (const table of SYNC_TABLES) {
      for (const row of await b.table(table).toArray()) expect(row.dirty).toBe(1)
    }
    expect(await b.schedules.count()).toBe(1)
  })

  it('keeps tombstones, so a deletion survives the round trip', async () => {
    await populate(a)
    const card = (await a.cards.toArray())[0]
    await a.cards.update(card.id, { deleted: true, updatedAt: 999 })
    await importData(b, parsed(await buildExport(a, t(1_000))), 'merge', t(2_000))
    expect((await b.cards.get(card.id))?.deleted).toBe(true)
  })

  it('does not put the dirty flag in the file', async () => {
    await populate(a)
    const file = await buildExport(a, t(1_000))
    expect(JSON.stringify(file)).not.toContain('"dirty"')
    expect(file.version).toBe(1)
    expect(file.app).toBe('wordwork')
  })
})

describe('merge', () => {
  it('keeps the newer side of each row and never removes anything', async () => {
    await populate(a)
    const file = parsed(await buildExport(a, t(1_000)))
    await importData(b, file, 'merge', t(2_000))

    const card = (await b.cards.toArray())[0]
    await b.cards.update(card.id, { translation: 'home', updatedAt: card.updatedAt + 100 })
    await b.minutes.put({
      id: 'only-here',
      day: '2026-11-06',
      minutes: 5,
      source: 'manual',
      createdAt: 1,
      updatedAt: 1,
      deleted: false,
      dirty: 1,
    })

    const summary = await importData(b, file, 'merge', t(3_000))
    expect(summary).toEqual({ added: 0, updated: 0, removed: 0 })
    expect((await b.cards.get(card.id))?.translation).toBe('home')
    expect(await b.minutes.get('only-here')).toBeDefined()
  })

  it('takes a newer row from the file', async () => {
    await populate(a)
    await importData(b, parsed(await buildExport(a, t(1_000))), 'merge', t(2_000))
    const card = (await a.cards.toArray())[0]
    await a.cards.update(card.id, { translation: 'building', updatedAt: card.updatedAt + 500 })

    const summary = await importData(b, parsed(await buildExport(a, t(3_000))), 'merge', t(4_000))
    expect(summary.updated).toBe(1)
    expect((await b.cards.get(card.id))?.translation).toBe('building')
  })
})

describe('replace', () => {
  it('tombstones local rows the file does not have, and the file wins on the rest', async () => {
    await populate(a)
    const file = parsed(await buildExport(a, t(1_000)))
    await importData(b, file, 'merge', t(2_000))

    await b.minutes.put({
      id: 'only-here',
      day: '2026-11-06',
      minutes: 5,
      source: 'manual',
      createdAt: 1,
      updatedAt: 1,
      deleted: false,
      dirty: 0,
    })
    const card = (await b.cards.toArray())[0]
    await b.cards.update(card.id, { translation: 'home', updatedAt: card.updatedAt + 100 })

    const summary = await importData(b, file, 'replace', t(5_000))
    expect(summary.removed).toBe(1)
    expect(await b.minutes.get('only-here')).toMatchObject({ deleted: true, dirty: 1 })
    const restored = await b.cards.get(card.id)
    expect(restored?.translation).toBe('house')
    // Newer than the edit it overwrote, or the server's last-write-wins guard would drop it.
    expect(restored?.updatedAt).toBeGreaterThan(card.updatedAt + 100)
    expect(restored?.dirty).toBe(1)
  })

  it('drops cached schedules for cards that lost their reviews', async () => {
    await populate(a)
    const file = parsed(await buildExport(a, t(1_000)))
    file.tables.reviews = []
    await importData(b, parsed(await buildExport(a, t(1_000))), 'merge', t(2_000))
    expect(await b.schedules.count()).toBe(1)

    await importData(b, file, 'replace', t(3_000))
    expect(await b.schedules.count()).toBe(0)
  })
})

describe('parseExport', () => {
  const ok = () =>
    JSON.parse(JSON.stringify({ app: 'wordwork', version: 1, exportedAt: 1, tables: {} }))
  const parse = (v: unknown) => parseExport(JSON.stringify(v))

  it('accepts an empty export, and files missing newer tables', () => {
    const r = parse(ok())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.tables.cards).toEqual([])
  })

  it('rejects text that is not JSON or not ours', () => {
    expect(parseExport('nope')).toMatchObject({ ok: false })
    expect(parse([])).toMatchObject({ ok: false })
    expect(parse({ app: 'other', version: 1, tables: {} })).toMatchObject({ ok: false })
  })

  it('rejects a missing, bad or newer version', () => {
    expect(parse({ ...ok(), version: undefined })).toMatchObject({ ok: false })
    expect(parse({ ...ok(), version: 0 })).toMatchObject({ ok: false })
    const newer = parse({ ...ok(), version: 2 })
    expect(newer).toMatchObject({ ok: false })
    expect(!newer.ok && newer.error).toMatch(/newer/)
  })

  it('names the row that is wrong', () => {
    const file = ok()
    file.tables = {
      minutes: [
        {
          id: 'a',
          day: '2026-11-07',
          minutes: 10,
          source: 'manual',
          createdAt: 1,
          updatedAt: 1,
          deleted: false,
        },
        {
          id: 'b',
          day: '2026-11-07',
          minutes: 'ten',
          source: 'manual',
          createdAt: 1,
          updatedAt: 1,
          deleted: false,
        },
      ],
    }
    const r = parse(file)
    expect(r).toEqual({ ok: false, error: 'minutes row 2 has a bad or missing "minutes".' })
  })

  it('rejects values the server would refuse', () => {
    const row = {
      id: 'a',
      day: '2026-11-07',
      minutes: 5000,
      source: 'manual',
      createdAt: 1,
      updatedAt: 1,
      deleted: false,
    }
    expect(parse({ ...ok(), tables: { minutes: [row] } })).toMatchObject({ ok: false })
    const bad = { ...row, minutes: 5, day: 'yesterday' }
    expect(parse({ ...ok(), tables: { minutes: [bad] } })).toMatchObject({ ok: false })
  })

  it('rejects duplicate ids', () => {
    const row = {
      id: 'a',
      day: '2026-11-07',
      minutes: 5,
      source: 'manual',
      createdAt: 1,
      updatedAt: 1,
      deleted: false,
    }
    const r = parse({ ...ok(), tables: { minutes: [row, row] } })
    expect(r).toMatchObject({ ok: false })
  })

  it('drops unknown columns, including a smuggled dirty flag', () => {
    const row = {
      id: 'a',
      day: '2026-11-07',
      minutes: 5,
      source: 'manual',
      createdAt: 1,
      updatedAt: 1,
      deleted: false,
      dirty: 0,
      evil: 'x',
    }
    const r = parse({ ...ok(), tables: { minutes: [row] } })
    expect(r.ok && r.data.tables.minutes[0]).toEqual({
      id: 'a',
      day: '2026-11-07',
      minutes: 5,
      source: 'manual',
      createdAt: 1,
      updatedAt: 1,
      deleted: false,
    })
  })

  it('checks the time zone in settings', () => {
    const settings = {
      id: 'me',
      newPerDay: 10,
      maxReviewsPerDay: 100,
      goalHours: 400,
      streakMinutes: 10,
      timeZone: 'Mars/Base',
      rolloverHour: 4,
      updatedAt: 1,
    }
    expect(parse({ ...ok(), tables: { settings: [settings] } })).toMatchObject({ ok: false })
    expect(
      parse({ ...ok(), tables: { settings: [{ ...settings, timeZone: 'Asia/Manila' }] } }),
    ).toMatchObject({ ok: true })
  })
})

describe('exportFileName', () => {
  it('is dated', () => {
    expect(exportFileName(new Date('2026-11-07T10:00:00Z'))).toBe('wordwork-2026-11-07.json')
  })
})

describe('what the server would refuse', () => {
  const minutesFile = (over: Record<string, unknown>) => ({
    app: 'wordwork',
    version: 1,
    exportedAt: 1,
    tables: {
      minutes: [
        {
          id: 'a',
          day: '2026-11-07',
          minutes: 5,
          source: 'manual',
          createdAt: 1,
          updatedAt: 1,
          deleted: false,
          ...over,
        },
      ],
    },
  })
  const rejects = (file: unknown) => expect(parseExport(JSON.stringify(file)).ok).toBe(false)

  it('rejects fractional, negative and out-of-range timestamps', () => {
    rejects(minutesFile({ updatedAt: 1.5 }))
    rejects(minutesFile({ updatedAt: -1 }))
    rejects(minutesFile({ createdAt: 1e300 }))
  })

  it('rejects a review duration or card order the integer columns cannot hold', () => {
    const review = {
      id: 'r',
      cardId: 'c',
      rating: 3,
      reviewedAt: 1,
      day: '2026-11-07',
      durationMs: 3e9,
      deviceId: 'd',
      updatedAt: 1,
      deleted: false,
    }
    rejects({ app: 'wordwork', version: 1, tables: { reviews: [review] } })
    rejects({ app: 'wordwork', version: 1, tables: { reviews: [{ ...review, durationMs: -1 }] } })
    rejects({ app: 'wordwork', version: 1, tables: { reviews: [{ ...review, durationMs: 1.5 }] } })
  })

  it('rejects a diary id that is not day:language', () => {
    const diary = {
      id: 'x',
      day: '2026-11-07',
      language: 'de',
      text: 'a',
      updatedAt: 1,
      deleted: false,
    }
    rejects({ app: 'wordwork', version: 1, tables: { diary: [diary] } })
    const good = { ...diary, id: '2026-11-07:de' }
    expect(
      parseExport(JSON.stringify({ app: 'wordwork', version: 1, tables: { diary: [good] } })).ok,
    ).toBe(true)
  })

  it('rejects strings Postgres cannot store', () => {
    rejects({
      app: 'wordwork',
      version: 1,
      tables: {
        diary: [
          {
            id: '2026-11-07:de',
            day: '2026-11-07',
            language: 'de',
            text: 'a\u0000b',
            updatedAt: 1,
            deleted: false,
          },
        ],
      },
    })
  })
})

describe('import stamps', () => {
  it('clamps a timestamp from the future to now', async () => {
    await populate(a)
    const file = parsed(await buildExport(a, t(1_000)))
    file.tables.minutes[0].updatedAt = 9_000_000_000_000
    await importData(b, file, 'merge', t(2_000))
    expect((await b.minutes.toArray())[0].updatedAt).toBe(2_000)
  })

  it('stamps every row replace writes with at least now, new rows included', async () => {
    await populate(a)
    const file = parsed(await buildExport(a, t(1_000)))
    await importData(b, file, 'replace', t(50_000))
    for (const table of SYNC_TABLES) {
      for (const row of await b.table(table).toArray()) {
        expect(row.updatedAt).toBeGreaterThanOrEqual(50_000)
      }
    }
  })

  it('outranks a row the server holds that this device had already pulled', async () => {
    await populate(a)
    const file = parsed(await buildExport(a, t(1_000)))
    await importData(b, file, 'merge', t(2_000))
    const card = (await b.cards.toArray())[0]
    // Pulled from the server at a time well after the backup was made.
    await b.cards.update(card.id, { translation: 'phone edit', updatedAt: 40_000, dirty: 0 })
    await importData(b, file, 'replace', t(5_000))
    const after = await b.cards.get(card.id)
    expect(after?.translation).toBe('house')
    expect(after?.updatedAt).toBeGreaterThan(40_000)
  })

  it('only moves the tombstone of a review that already exists', async () => {
    await populate(a)
    const file = parsed(await buildExport(a, t(1_000)))
    await importData(b, file, 'merge', t(2_000))
    const review = file.tables.reviews[0]
    review.rating = 1
    review.updatedAt = 500
    review.deleted = true
    await importData(b, file, 'merge', t(3_000))
    expect(await b.reviews.get(review.id as string)).toMatchObject({ rating: 3, deleted: true })
  })
})
