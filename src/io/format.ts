import { SYNC_TABLES, type SyncTable, type WordworkDb } from '../db/schema.ts'
import { TICK_ID } from '../db/ticks.ts'

export const EXPORT_APP = 'wordwork'
export const EXPORT_VERSION = 1

/** A row as it appears in a file: every column except the local-only `dirty` flag. */
export type FileRow = Record<string, unknown> & { id: string; updatedAt: number; deleted?: boolean }

export interface ExportFile {
  app: typeof EXPORT_APP
  version: number
  exportedAt: number
  tables: Record<SyncTable, FileRow[]>
}

export type ParseResult = { ok: true; data: ExportFile } | { ok: false; error: string }

type Check = (v: unknown) => boolean

// Postgres text refuses NUL, so a string with one would never sync.
const str: Check = (v) => typeof v === 'string' && !v.includes('\u0000')
/** Epoch milliseconds: the server columns are bigint. */
const ts: Check = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
const INT32 = 2 ** 31 - 1
const bool: Check = (v) => typeof v === 'boolean'
const int =
  (min: number, max: number): Check =>
  (v) =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
const day: Check = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const strings: Check = (v) => Array.isArray(v) && v.every(str)
const stringMap: Check = (v) =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every(str)
const zone: Check = (v) => {
  if (typeof v !== 'string' || !v) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v })
    return true
  } catch {
    return false
  }
}
const optional =
  (check: Check): Check =>
  (v) =>
    v === undefined || v === null || check(v)

// The columns each table keeps. Anything else in a file is dropped, `dirty` included.
const SHAPES: Record<SyncTable, Record<string, Check>> = {
  decks: { id: str, language: str, name: str, createdAt: ts, updatedAt: ts, deleted: bool },
  cards: {
    id: str,
    deckId: str,
    term: str,
    translation: str,
    example: optional(str),
    exampleTranslation: optional(str),
    extra: stringMap,
    tags: strings,
    source: optional(str),
    newOrder: int(-INT32, INT32),
    suspended: bool,
    createdAt: ts,
    updatedAt: ts,
    deleted: bool,
  },
  reviews: {
    id: str,
    cardId: str,
    rating: int(1, 4),
    reviewedAt: ts,
    day,
    durationMs: int(0, INT32),
    deviceId: str,
    updatedAt: ts,
    deleted: bool,
  },
  minutes: {
    id: str,
    day,
    minutes: int(0, 1_440),
    source: (v) => v === 'manual' || v === 'review',
    createdAt: ts,
    updatedAt: ts,
    deleted: bool,
  },
  diary: { id: str, day, language: str, text: str, updatedAt: ts, deleted: bool },
  songs: {
    id: str,
    language: str,
    weekOf: day,
    title: str,
    artist: str,
    url: optional(str),
    notes: str,
    updatedAt: ts,
    deleted: bool,
  },
  settings: {
    id: (v) => v === 'me',
    newPerDay: int(0, 100_000),
    maxReviewsPerDay: int(0, 100_000),
    goalHours: int(1, 100_000),
    streakMinutes: int(1, 1_440),
    timeZone: zone,
    rolloverHour: int(0, 23),
    updatedAt: ts,
  },
  ticks: {
    id: (v) => typeof v === 'string' && TICK_ID.test(v),
    day: optional(day),
    updatedAt: ts,
    deleted: bool,
  },
}

function checkRow(table: SyncTable, raw: unknown): FileRow | string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'is not an object'
  const row = raw as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, check] of Object.entries(SHAPES[table])) {
    const value = row[key]
    if (!check(value)) return `has a bad or missing "${key}"`
    if (value !== undefined && value !== null) out[key] = value
  }
  // The server insists on this, and a row that breaks it would fail to sync on every attempt.
  if (table === 'diary' && out.id !== `${out.day}:${out.language}`) {
    return 'has an id that is not "day:language"'
  }
  if (table === 'ticks' && out.day !== undefined && !(out.id as string).startsWith(`${out.day}:`)) {
    return 'has an id that does not start with its day'
  }
  return out as FileRow
}

/** Turns the text of a file into rows, or says what is wrong with it. Nothing is trusted. */
export function parseExport(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: "That file isn't valid JSON." }
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ok: false, error: "That file isn't a wordwork export." }
  }
  const file = json as Record<string, unknown>
  if (file.app !== EXPORT_APP) return { ok: false, error: "That file isn't a wordwork export." }
  if (typeof file.version !== 'number' || !Number.isInteger(file.version) || file.version < 1) {
    return { ok: false, error: 'That export has no usable version.' }
  }
  if (file.version > EXPORT_VERSION) {
    return { ok: false, error: 'That export is from a newer version of wordwork.' }
  }
  const tables = file.tables
  if (typeof tables !== 'object' || tables === null || Array.isArray(tables)) {
    return { ok: false, error: 'That export has no tables.' }
  }

  const out = {} as Record<SyncTable, FileRow[]>
  for (const table of SYNC_TABLES) {
    const rows = (tables as Record<string, unknown>)[table]
    if (rows === undefined) {
      out[table] = []
      continue
    }
    if (!Array.isArray(rows)) return { ok: false, error: `"${table}" is not a list.` }
    const seen = new Set<string>()
    const parsed: FileRow[] = []
    for (const [i, raw] of rows.entries()) {
      const row = checkRow(table, raw)
      if (typeof row === 'string') return { ok: false, error: `${table} row ${i + 1} ${row}.` }
      if (seen.has(row.id)) return { ok: false, error: `${table} has the id "${row.id}" twice.` }
      seen.add(row.id)
      parsed.push(row)
    }
    out[table] = parsed
  }

  const exportedAt = typeof file.exportedAt === 'number' ? file.exportedAt : 0
  return {
    ok: true,
    data: { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt, tables: out },
  }
}

/** Everything in the database, tombstones included, as one versioned file. */
export async function buildExport(db: WordworkDb, now: Date): Promise<ExportFile> {
  const tables = {} as Record<SyncTable, FileRow[]>
  for (const table of SYNC_TABLES) {
    const rows = await db.table(table).toArray()
    tables[table] = rows.map((row) => {
      const copy = { ...row }
      delete copy.dirty
      return copy as FileRow
    })
  }
  return { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt: now.getTime(), tables }
}

export function exportFileName(now: Date): string {
  return `wordwork-${now.toISOString().slice(0, 10)}.json`
}
