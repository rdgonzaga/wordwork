import { SYNC_TABLES, type WordworkDb } from '../db/schema.ts'

export const WRITE_DEBOUNCE_MS = 5_000

type Listener = () => void

export interface TriggerDeps {
  db: WordworkDb
  /** Runs a sync. Failures are the status store's business; triggers only fire it. */
  sync: () => Promise<unknown>
  isSignedIn: () => boolean
  /** Calls `fn` on any auth change; returns the unsubscribe. */
  onAuthChange: (fn: Listener) => () => void
  win: Pick<Window, 'addEventListener' | 'removeEventListener'>
  doc: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>
  debounceMs?: number
}

/**
 * Starts the sync triggers: sign-in (which is also app open for a returning user), the tab
 * coming back to the foreground, the browser going online, and a quiet spell after a local
 * write. Returns a function that stops them.
 */
export function startSyncTriggers(deps: TriggerDeps): () => void {
  const { db, win, doc, debounceMs = WRITE_DEBOUNCE_MS } = deps

  function fire() {
    if (!deps.isSignedIn()) return
    // The status store records the outcome; a rejection here would only be noise.
    deps.sync().catch(() => {})
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  function afterWrite() {
    if (!deps.isSignedIn()) return
    clearTimeout(timer)
    timer = setTimeout(fire, debounceMs)
  }

  let wasSignedIn = false
  const offAuth = deps.onAuthChange(() => {
    const now = deps.isSignedIn()
    if (now && !wasSignedIn) fire()
    wasSignedIn = now
  })
  wasSignedIn = deps.isSignedIn()
  fire()

  const onVisible = () => {
    if (doc.visibilityState === 'visible') fire()
  }
  doc.addEventListener('visibilitychange', onVisible)
  win.addEventListener('online', fire)

  // Only writes that leave a row dirty count. Sync's own writes clear `dirty` or arrive
  // clean, so they can't start another sync.
  const onCreate = (_key: unknown, row: { dirty?: number }) => {
    if (row.dirty === 1) afterWrite()
  }
  const onUpdate = (mods: { dirty?: number; updatedAt?: number }, _key: unknown, row: object) => {
    const dirty = 'dirty' in mods ? mods.dirty : (row as { dirty?: number }).dirty
    // A second edit to an already-dirty row only changes updatedAt.
    if (dirty === 1 && ('dirty' in mods || 'updatedAt' in mods)) afterWrite()
    return undefined
  }
  for (const name of SYNC_TABLES) {
    const table = db.table(name)
    table.hook('creating', onCreate)
    table.hook('updating', onUpdate)
  }

  return () => {
    clearTimeout(timer)
    offAuth()
    doc.removeEventListener('visibilitychange', onVisible)
    win.removeEventListener('online', fire)
    for (const name of SYNC_TABLES) {
      const table = db.table(name)
      table.hook('creating').unsubscribe(onCreate)
      table.hook('updating').unsubscribe(onUpdate)
    }
  }
}
