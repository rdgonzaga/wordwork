import type { Session, SupabaseClient } from '@supabase/supabase-js'

export type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'signedIn'; email: string; userId: string }

export interface AuthDeps {
  getClient: () => SupabaseClient | null
  hasStoredSession: () => boolean
}

function toState(session: Session | null): AuthState {
  if (!session) return { status: 'guest' }
  return { status: 'signedIn', email: session.user.email ?? '', userId: session.user.id }
}

export function createAuthStore({ getClient, hasStoredSession }: AuthDeps) {
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
    client.auth.onAuthStateChange((_event, session) => set(toState(session)))
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
      const { data } = await client.auth.getSession()
      set(toState(data.session))
    },

    /** Emails a 6-digit code. Sign-ups are off, so unknown addresses fail. */
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
      set(toState(data.session))
    },

    /** Local data stays on the device; only the session goes. */
    async signOut() {
      const client = getClient()
      if (client) await client.auth.signOut()
      set({ status: 'guest' })
    },
  }
}

export type AuthStore = ReturnType<typeof createAuthStore>
