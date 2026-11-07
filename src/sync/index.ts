import { auth } from '../auth/index.ts'
import { getClient } from '../auth/client.ts'
import { db } from '../db/schema.ts'
import { runSync, type SyncResult } from './engine.ts'
import { supabaseRemote } from './remote.ts'

let inFlight: Promise<SyncResult | undefined> | null = null

/**
 * Syncs this device with Supabase. Resolves to `undefined` without touching the network when
 * signed out, so guests never call Supabase. Calls made while a sync runs share it; the
 * triggers (#17) call again after local writes, which picks up anything edited meanwhile.
 */
export function syncNow(): Promise<SyncResult | undefined> {
  if (inFlight) return inFlight
  const state = auth.getState()
  const client = state.status === 'signedIn' ? getClient() : null
  if (state.status !== 'signedIn' || !client) return Promise.resolve(undefined)

  inFlight = runSync(db, supabaseRemote(client), state.userId).finally(() => {
    inFlight = null
  })
  return inFlight
}
