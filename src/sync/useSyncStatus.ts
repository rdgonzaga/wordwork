import { useSyncExternalStore } from 'react'
import { syncStatus } from './index.ts'
import type { SyncStatus } from './status.ts'

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(syncStatus.subscribe, syncStatus.getState)
}
