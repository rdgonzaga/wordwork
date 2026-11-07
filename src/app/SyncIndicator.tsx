import { useAuth } from '../auth/index.ts'
import { syncNow } from '../sync/index.ts'
import { useSyncStatus } from '../sync/useSyncStatus.ts'

const LABELS = {
  idle: 'Synced',
  syncing: 'Syncing…',
  offline: 'Offline',
  error: 'Sync problem',
} as const

/** Shown only when signed in; guests have nothing to sync. */
export default function SyncIndicator() {
  const auth = useAuth()
  const { phase, message } = useSyncStatus()
  if (auth.status !== 'signedIn') return null

  const retryable = phase === 'offline' || phase === 'error'
  return (
    <p className="sync-status" data-phase={phase} role="status" title={message}>
      <span className="sync-dot" aria-hidden="true" />
      {LABELS[phase]}
      {message && phase === 'error' && <span className="muted"> · {message}</span>}
      {retryable && (
        <button type="button" className="link" onClick={() => void syncNow().catch(() => {})}>
          Retry
        </button>
      )}
    </p>
  )
}
