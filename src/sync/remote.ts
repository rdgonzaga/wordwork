import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncTable } from '../db/schema.ts'
import type { Row } from './mapping.ts'

/** A failed server call. `code` is the Postgres/PostgREST code when there is one. */
export class RemoteError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'RemoteError'
    this.code = code
  }
}

/** The two server calls sync needs. Tests swap in an in-memory server. */
export interface Remote {
  /**
   * Upserts rows and returns the rows the server actually wrote. A row the server's
   * last-write-wins guard dropped as stale is absent from the result.
   */
  upsert(table: SyncTable, rows: Row[]): Promise<Row[]>
  /** Rows with `server_seq > after`, oldest first, at most `limit`. */
  pull(table: SyncTable, after: number, limit: number): Promise<Row[]>
}

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async upsert(table, rows) {
      // .select() makes PostgREST send `Prefer: return=representation`, which is how we
      // learn which rows the stale guard skipped.
      const { data, error } = await client
        .from(table)
        .upsert(rows, { onConflict: 'user_id,id' })
        .select()
      if (error) throw new RemoteError(error.message, error.code)
      return data as Row[]
    },

    async pull(table, after, limit) {
      const { data, error } = await client
        .from(table)
        .select()
        .gt('server_seq', after)
        .order('server_seq', { ascending: true })
        .limit(limit)
      if (error) throw new RemoteError(error.message, error.code)
      return data as Row[]
    },
  }
}
