import { auth } from '../auth/index.ts'
import { getClient } from '../auth/client.ts'
import { db } from '../db/schema.ts'
import { runSync, type SyncResult } from './engine.ts'
import { supabaseRemote } from './remote.ts'

let inFlight: Promise<SyncResult | undefined> | null = null
let rerun = false

async function run(): Promise<SyncResult | undefined> {
  const state = auth.getState()
  const client = state.status === 'signedIn' ? getClient() : null
  if (state.status !== 'signedIn' || !client) return undefined

  let result = await runSync(db, supabaseRemote(client), state.userId)
  // A call that arrived mid-run was folded into it, but that run had already collected its
  // dirty rows. Go once more so those edits don't wait for the next trigger.
  while (rerun) {
    rerun = false
    result = await runSync(db, supabaseRemote(client), state.userId)
  }
  return result
}

/**
 * Syncs this device with Supabase. Resolves to `undefined` without touching the network when
 * signed out, so guests never call Supabase. A call made while a sync is running shares it and
 * makes it run once more when it finishes.
 */
export function syncNow(): Promise<SyncResult | undefined> {
  if (inFlight) {
    rerun = true
    return inFlight
  }
  inFlight = run().finally(() => {
    inFlight = null
    rerun = false
  })
  return inFlight
}
