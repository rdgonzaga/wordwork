import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// supabase-js reads and writes this localStorage key. localStorage survives the
// iOS home-screen PWA, so the session stays put between launches.
export const AUTH_STORAGE_KEY = 'wordwork-auth'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

export function isSyncConfigured(): boolean {
  return Boolean(url && anonKey)
}

/**
 * The client is built lazily, only once someone signs in or a stored session
 * exists. A guest never constructs it, so a guest never touches Supabase.
 */
export function getClient(): SupabaseClient | null {
  if (!url || !anonKey) return null
  client ??= createClient(url, anonKey, {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      // OTP codes are typed in, never delivered through a redirect URL.
      detectSessionInUrl: false,
    },
  })
  return client
}

export function hasStoredSession(): boolean {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) !== null
  } catch {
    return false
  }
}
