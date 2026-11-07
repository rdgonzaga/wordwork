import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createAuthStore } from './store.ts'

const session = { user: { id: 'u1', email: 'me@example.com' } }

function fakeClient() {
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session } }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(),
  }
  return { client: { auth } as unknown as SupabaseClient, auth }
}

describe('auth store', () => {
  it('guest with no stored session never builds the client', async () => {
    const getClient = vi.fn()
    const store = createAuthStore({ getClient, hasStoredSession: () => false })
    expect(store.getState()).toEqual({ status: 'guest' })
    await store.init()
    expect(store.getState()).toEqual({ status: 'guest' })
    expect(getClient).not.toHaveBeenCalled()
  })

  it('restores a stored session', async () => {
    const { client, auth } = fakeClient()
    const store = createAuthStore({ getClient: () => client, hasStoredSession: () => true })
    expect(store.getState()).toEqual({ status: 'loading' })
    await store.init()
    expect(auth.getSession).toHaveBeenCalled()
    expect(store.getState()).toEqual({ status: 'signedIn', email: 'me@example.com', userId: 'u1' })
  })

  it('falls back to guest when sync is not configured', async () => {
    const store = createAuthStore({ getClient: () => null, hasStoredSession: () => true })
    await store.init()
    expect(store.getState()).toEqual({ status: 'guest' })
    await expect(store.requestCode('me@example.com')).rejects.toThrow('not set up')
  })

  it('requests a code without creating users', async () => {
    const { client, auth } = fakeClient()
    const store = createAuthStore({ getClient: () => client, hasStoredSession: () => false })
    await store.requestCode('me@example.com')
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'me@example.com',
      options: { shouldCreateUser: false },
    })
  })

  it('surfaces request errors', async () => {
    const { client, auth } = fakeClient()
    auth.signInWithOtp.mockResolvedValue({ error: new Error('rate limited') })
    const store = createAuthStore({ getClient: () => client, hasStoredSession: () => false })
    await expect(store.requestCode('me@example.com')).rejects.toThrow('rate limited')
  })

  it('signs in with an email code and notifies subscribers', async () => {
    const { client, auth } = fakeClient()
    const store = createAuthStore({ getClient: () => client, hasStoredSession: () => false })
    const seen = vi.fn()
    store.subscribe(seen)
    await store.verifyCode('me@example.com', '123456')
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'me@example.com',
      token: '123456',
      type: 'email',
    })
    expect(store.getState().status).toBe('signedIn')
    expect(seen).toHaveBeenCalled()
    expect(auth.onAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('keeps the state on a wrong code', async () => {
    const { client, auth } = fakeClient()
    auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: new Error('bad code') })
    const store = createAuthStore({ getClient: () => client, hasStoredSession: () => false })
    await expect(store.verifyCode('me@example.com', '000000')).rejects.toThrow('bad code')
    expect(store.getState()).toEqual({ status: 'guest' })
  })

  it('signs out to guest', async () => {
    const { client, auth } = fakeClient()
    const store = createAuthStore({ getClient: () => client, hasStoredSession: () => true })
    await store.init()
    await store.signOut()
    expect(auth.signOut).toHaveBeenCalled()
    expect(store.getState()).toEqual({ status: 'guest' })
  })
})
