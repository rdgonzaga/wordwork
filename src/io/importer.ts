import { rebuildSchedules } from '../db/srs.ts'
import { SYNC_TABLES, type SyncTable, type WordworkDb } from '../db/schema.ts'
import { stamp } from '../db/stamp.ts'
import type { ExportFile, FileRow } from './format.ts'

export type ImportMode = 'merge' | 'replace'

export interface ImportSummary {
  added: number
  updated: number
  /** Replace only: local rows that weren't in the file and were deleted. */
  removed: number
}

interface LocalRow {
  id: string
  updatedAt: number
  deleted?: boolean
  dirty: 0 | 1
}

/**
 * Loads a parsed file into the database. Every row it writes is left dirty, so the next sync
 * sends it.
 *
 * Merge keeps whichever side was edited last, row by row, and never removes anything.
 * Replace makes the file the truth: its rows win, and local rows it doesn't have are
 * tombstoned (not erased, so the removal syncs to other devices).
 */
export async function importData(
  db: WordworkDb,
  file: ExportFile,
  mode: ImportMode,
  now: Date,
): Promise<ImportSummary> {
  const summary: ImportSummary = { added: 0, updated: 0, removed: 0 }

  await db.transaction('rw', [...SYNC_TABLES.map((t) => db.table(t)), db.schedules], async () => {
    for (const table of SYNC_TABLES) {
      await importTable(db, table, file.tables[table], mode, now, summary)
    }
    const cardIds = (await db.reviews.toArray()).map((r) => r.cardId)
    await rebuildSchedules(db, cardIds)
    // A card whose reviews are gone shouldn't keep a cached schedule.
    const have = new Set(cardIds)
    for (const key of await db.schedules.toCollection().primaryKeys()) {
      if (!have.has(key)) await db.schedules.delete(key)
    }
  })
  return summary
}

async function importTable(
  db: WordworkDb,
  table: SyncTable,
  rows: FileRow[],
  mode: ImportMode,
  now: Date,
  summary: ImportSummary,
) {
  const t = db.table<LocalRow, string>(table)
  const local = new Map((await t.toArray()).map((r) => [r.id, r]))

  for (const file of rows) {
    // A timestamp from the future would out-rank every later edit on every device.
    const row = { ...file, updatedAt: Math.min(file.updatedAt, now.getTime()) }
    const current = local.get(row.id)
    if (!current) {
      // Replace has to beat whatever the server holds, which this device may not have seen.
      const updatedAt = mode === 'replace' ? stamp(row.updatedAt, now) : row.updatedAt
      await t.put({ ...row, updatedAt, dirty: 1 } as never)
      summary.added++
      continue
    }
    if (mode === 'merge' && row.updatedAt <= current.updatedAt) continue

    const updatedAt =
      mode === 'replace' ? stamp(Math.max(current.updatedAt, row.updatedAt), now) : row.updatedAt
    // The server never lets a review's rating, card or day change, so only its tombstone moves.
    const next =
      table === 'reviews'
        ? { ...current, deleted: row.deleted, updatedAt, dirty: 1 }
        : { ...row, updatedAt, dirty: 1 }
    await t.put(next as never)
    summary.updated++
  }

  // One settings row; there's nothing to tombstone.
  if (mode !== 'replace' || table === 'settings') return
  const inFile = new Set(rows.map((r) => r.id))
  for (const current of local.values()) {
    if (inFile.has(current.id) || current.deleted) continue
    await t.update(current.id, {
      deleted: true,
      updatedAt: stamp(current.updatedAt, now),
      dirty: 1,
    })
    summary.removed++
  }
}
