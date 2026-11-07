export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncStatus {
  phase: SyncPhase
  /** When the last sync finished cleanly. */
  lastSyncedAt?: number
  /** What went wrong, for the `error` phase. */
  message?: string
}

const NETWORK_MESSAGE = /failed to fetch|load failed|networkerror|network request failed/i

/** Whether a sync failure just means there's no connection right now. */
export function isOfflineError(e: unknown, online = true): boolean {
  if (!online) return true
  return e instanceof Error && NETWORK_MESSAGE.test(e.message)
}

export function createSyncStatus() {
  let state: SyncStatus = { phase: 'idle' }
  const subscribers = new Set<() => void>()

  function set(next: SyncStatus) {
    state = next
    subscribers.forEach((fn) => fn())
  }

  return {
    getState: () => state,

    subscribe(fn: () => void) {
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    },

    started() {
      set({ ...state, phase: 'syncing', message: undefined })
    },

    finished(now: number, failedRows = 0) {
      if (failedRows > 0) {
        const noun = failedRows === 1 ? 'row' : 'rows'
        set({ ...state, phase: 'error', message: `${failedRows} ${noun} couldn't sync.` })
      } else {
        set({ phase: 'idle', lastSyncedAt: now })
      }
    },

    failed(e: unknown, online = true) {
      if (isOfflineError(e, online)) {
        set({ ...state, phase: 'offline', message: undefined })
      } else {
        const message = e instanceof Error ? e.message : 'Sync failed.'
        set({ ...state, phase: 'error', message })
      }
    },
  }
}

export type SyncStatusStore = ReturnType<typeof createSyncStatus>
