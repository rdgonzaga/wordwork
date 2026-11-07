import type { SyncTable } from '../db/schema.ts'
import type { Row } from './mapping.ts'
import { RemoteError, type Remote } from './remote.ts'

/**
 * In-memory stand-in for the Supabase side of 0001_init.sql, for tests: one global sequence,
 * last-write-wins that silently drops stale writes, and reviews that keep their immutable columns.
 */
export class FakeServer implements Remote {
  readonly tables = new Map<SyncTable, Map<string, Row>>()
  seq = 0
  /** Throw this for the next calls (e.g. offline). */
  failWith: Error | null = null
  /** Reject any batch containing a row this returns true for, like a CHECK violation. */
  rejectRow: ((table: SyncTable, row: Row) => boolean) | null = null
  /** Postgres error code used by `rejectRow`. */
  rejectCode = '23514'
  /** Runs after rows are written, before the response returns (simulates edits mid-push). */
  onUpsert: (() => Promise<void>) | null = null
  upsertCalls: { table: SyncTable; rows: Row[] }[] = []

  rows(table: SyncTable): Row[] {
    return [...(this.tables.get(table)?.values() ?? [])]
  }

  row(table: SyncTable, id: string): Row | undefined {
    return this.tables.get(table)?.get(id)
  }

  async upsert(table: SyncTable, rows: Row[]): Promise<Row[]> {
    if (this.failWith) throw this.failWith
    this.upsertCalls.push({ table, rows })
    if (this.rejectRow && rows.some((r) => this.rejectRow!(table, r))) {
      throw new RemoteError('violates check constraint', this.rejectCode)
    }
    const store = this.tables.get(table) ?? new Map<string, Row>()
    this.tables.set(table, store)

    const written: Row[] = []
    for (const incoming of rows) {
      const id = String(incoming.id)
      const old = store.get(id)
      if (old && Number(incoming.updated_at) < Number(old.updated_at)) continue
      let next: Row = { ...old, ...incoming }
      if (old && table === 'reviews') {
        // Append-only: only updated_at and deleted may change.
        next = { ...old, updated_at: incoming.updated_at, deleted: incoming.deleted }
      }
      next.server_seq = ++this.seq
      store.set(id, next)
      written.push(next)
    }
    await this.onUpsert?.()
    return written
  }

  async pull(table: SyncTable, after: number, limit: number): Promise<Row[]> {
    if (this.failWith) throw this.failWith
    return this.rows(table)
      .filter((r) => Number(r.server_seq) > after)
      .sort((a, b) => Number(a.server_seq) - Number(b.server_seq))
      .slice(0, limit)
  }
}
