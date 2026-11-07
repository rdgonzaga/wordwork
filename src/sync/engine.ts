import { getSyncMeta } from '../db/meta.ts'
import { SYNC_TABLES, type SyncTable, type WordworkDb } from '../db/schema.ts'
import { mappings, type Row } from './mapping.ts'
import { RemoteError, type Remote } from './remote.ts'

const PUSH_BATCH = 200
const PULL_PAGE = 500

export interface FailedRow {
  table: SyncTable
  id: string
  message: string
}

export interface SyncResult {
  pushed: number
  pulled: number
  /** Rows the server rejected on a constraint. They stay dirty; everything else still synced. */
  failed: FailedRow[]
}

interface LocalRow {
  id: string
  updatedAt: number
  dirty: 0 | 1
}

/**
 * Postgres data errors (class 22: bad or out-of-range value) and integrity-constraint
 * violations (class 23): a bad row, not a bad connection.
 */
function isConstraintError(e: unknown): e is RemoteError {
  return e instanceof RemoteError && /^2[23]/.test(e.code ?? '')
}

/**
 * One full sync: push every dirty row, then pull everything past each table's cursor.
 * Throws on anything that isn't a per-row constraint failure (offline, 401, 5xx); the caller
 * retries later and nothing is lost, because rows stay dirty until the server accepts them.
 */
export async function runSync(db: WordworkDb, remote: Remote, userId: string): Promise<SyncResult> {
  const meta = await getSyncMeta(db)
  if (meta.userId && meta.userId !== userId) {
    throw new Error('This device is synced to a different account.')
  }
  if (!meta.userId) await db.syncMeta.update('me', { userId })

  const result: SyncResult = { pushed: 0, pulled: 0, failed: [] }
  for (const table of SYNC_TABLES) await push(db, remote, table, result)
  for (const table of SYNC_TABLES) await pull(db, remote, table, result)
  return result
}

async function dirtyRows(db: WordworkDb, table: SyncTable): Promise<LocalRow[]> {
  const t = db.table<LocalRow, string>(table)
  // `settings` is one row and has no dirty index.
  if (table === 'settings') return (await t.toArray()).filter((r) => r.dirty === 1)
  return t.where('dirty').equals(1).toArray()
}

async function push(db: WordworkDb, remote: Remote, table: SyncTable, result: SyncResult) {
  const rows = await dirtyRows(db, table)
  for (let i = 0; i < rows.length; i += PUSH_BATCH) {
    await pushChunk(db, remote, table, rows.slice(i, i + PUSH_BATCH), result)
  }
}

async function pushChunk(
  db: WordworkDb,
  remote: Remote,
  table: SyncTable,
  chunk: LocalRow[],
  result: SyncResult,
) {
  const { toRow } = mappings[table]
  let accepted: Row[]
  try {
    accepted = await remote.upsert(table, chunk.map(toRow))
  } catch (e) {
    if (!isConstraintError(e)) throw e
    if (chunk.length > 1) {
      // One bad row fails the whole batch. Retry singly so the good rows still go through.
      for (const row of chunk) await pushChunk(db, remote, table, [row], result)
      return
    }
    result.failed.push({ table, id: chunk[0].id, message: e.message })
    return
  }

  // Rows the stale guard dropped are missing from `accepted`. They stay dirty; the pull
  // below brings the newer server version and replaces them.
  const acceptedIds = new Set(accepted.map((r) => String(r.id)))
  const sent = chunk.filter((r) => acceptedIds.has(r.id))
  await db.transaction('rw', db.table(table), async () => {
    const t = db.table<LocalRow, string>(table)
    for (const row of sent) {
      const current = await t.get(row.id)
      // Edited while the push was in flight? updatedAt moved, so it stays dirty for next time.
      if (current && current.updatedAt === row.updatedAt) await t.update(row.id, { dirty: 0 })
    }
  })
  result.pushed += sent.length
}

/** Whether a pulled server row replaces the local one (last-write-wins). */
function shouldApply(table: SyncTable, local: LocalRow | undefined, remoteUpdatedAt: number) {
  if (!local || !local.dirty) return true // nothing unpushed to protect
  if (remoteUpdatedAt > local.updatedAt) return true
  // Reviews are append-only and the server keeps immutable columns, so on a tie the
  // server copy is the canonical one.
  return table === 'reviews' && remoteUpdatedAt === local.updatedAt
}

async function pull(db: WordworkDb, remote: Remote, table: SyncTable, result: SyncResult) {
  const { fromRow } = mappings[table]
  let after = (await getSyncMeta(db)).cursors[table] ?? 0

  for (;;) {
    const page = await remote.pull(table, after, PULL_PAGE)
    if (page.length === 0) return

    const seqs = page.map((r) => Number(r.server_seq))
    if (seqs.some((s) => !Number.isFinite(s))) throw new Error(`Bad server_seq from ${table}`)
    const high = Math.max(...seqs)

    await db.transaction('rw', db.table(table), db.syncMeta, async () => {
      const t = db.table<LocalRow, string>(table)
      const apply: LocalRow[] = []
      for (const row of page) {
        const incoming = fromRow(row)
        const local = await t.get(incoming.id)
        if (shouldApply(table, local, incoming.updatedAt)) apply.push(incoming)
      }
      await t.bulkPut(apply)
      result.pulled += apply.length

      // Same transaction as the rows, so a crash can't advance the cursor past unsaved data.
      const meta = await getSyncMeta(db)
      await db.syncMeta.update('me', { cursors: { ...meta.cursors, [table]: high } })
    })

    if (high <= after || page.length < PULL_PAGE) return
    after = high
  }
}
