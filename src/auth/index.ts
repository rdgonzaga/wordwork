import { useSyncExternalStore } from 'react'
import { getClient, hasStoredSession } from './client.ts'
import { createAuthStore, type AuthState } from './store.ts'

export const auth = createAuthStore({ getClient, hasStoredSession })

export function useAuth(): AuthState {
  return useSyncExternalStore(auth.subscribe, auth.getState)
}
