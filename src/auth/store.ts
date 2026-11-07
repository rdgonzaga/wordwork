import { isAuthRetryableFetchError, type Session, type SupabaseClient } from '@supabase/supabase-js'

export type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'signedIn'; email: string; userId: string }

export interface AuthDeps {
  getClient: () => SupabaseClient | null
  hasStoredSession: () => boolean
  /** The user from the persisted session, readable with no network. */
  storedUser: () => { id: string; email: string } | null
}

function toState(session: Session | null): AuthState {
  if (!session) return { status: 'guest' }
  return { status: 'signedIn', email: session.user.email ?? '', userId: session.user.id }
}

export function createAuthStore({ getClient, hasStoredSession, storedUser }: AuthDeps) {
  let state: AuthState = hasStoredSession() ? { status: 'loading' } : { status: 'guest' }
  let listening = false
  const subscribers = new Set<() => void>()

  function set(next: AuthState) {
    state = next
    subscribers.forEach((fn) => fn())
  }

  function listen(client: SupabaseClient) {
    if (listening) return
    listening = true
    client.auth.onAuthStateChange((event, session) => {
      // Offline with an expired token, auth-js emits INITIAL_SESSION with null
      // even though the session is still stored. Don't undo a restored sign-in.
      if (event === 'INITIAL_SESSION' && !session && state.status === 'signedIn') return
      set(toState(session))
    })
  }

  /** Token refresh failed on a network error: the stored session is still valid. */
  function restoreOffline() {
    const user = storedUser()
    set(user ? { status: 'signedIn', email: user.email, userId: user.id } : { status: 'guest' })
  }

  return {
    getState: () => state,

    subscribe(fn: () => void) {
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    },

    /** Call once at startup. With no stored session this makes no network calls. */
    async init() {
      if (!hasStoredSession()) {
        set({ status: 'guest' })
        return
      }
      const client = getClient()
      if (!client) {
        set({ status: 'guest' })
        return
      }
      listen(client)
      try {
        const { data, error } = await client.auth.getSession()
        if (error && isAuthRetryableFetchError(error)) restoreOffline()
        else set(toState(data.session))
      } catch {
        restoreOffline()
      }
    },

    /** Emails a one-time code. Sign-ups are off, so unknown addresses fail. */
    async requestCode(email: string) {
      const client = getClient()
      if (!client) throw new Error('Sync is not set up.')
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
      if (error) throw error
    },

    async verifyCode(email: string, token: string) {
      const client = getClient()
      if (!client) throw new Error('Sync is not set up.')
      listen(client)
      const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' })
      if (error) throw error
      if (!data.session) throw new Error('No session returned.')
      set(toState(data.session))
    },

    /** Local data stays on the device; only the session goes. */
    async signOut() {
      const client = getClient()
      if (client) {
        try {
          // Global sign-out revokes the refresh token, but fails offline and then
          // leaves the session in storage. Fall back to clearing it locally.
          const { error } = await client.auth.signOut()
          if (error) await client.auth.signOut({ scope: 'local' })
        } catch {
          await client.auth.signOut({ scope: 'local' })
        }
      }
      set({ status: 'guest' })
    },
  }
}

export type AuthStore = ReturnType<typeof createAuthStore>
