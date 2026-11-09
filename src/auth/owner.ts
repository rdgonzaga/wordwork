import { useAuth } from './index.ts'
import type { AuthState } from './store.ts'

/** The account the guide belongs to. Hides the button only; the guide text is in the bundle. */
const OWNER_ID: string | undefined = import.meta.env.VITE_OWNER_ID

export function isOwner(state: AuthState, ownerId = OWNER_ID): boolean {
  return Boolean(ownerId) && state.status === 'signedIn' && state.userId === ownerId
}

export function useIsOwner(): boolean {
  return isOwner(useAuth())
}
