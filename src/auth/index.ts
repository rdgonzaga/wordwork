import { useSyncExternalStore } from 'react'
import { getClient, hasStoredSession, readStoredUser } from './client.ts'
import { createAuthStore, type AuthState } from './store.ts'

export const auth = createAuthStore({ getClient, hasStoredSession, storedUser: readStoredUser })

export function useAuth(): AuthState {
  return useSyncExternalStore(auth.subscribe, auth.getState)
}
