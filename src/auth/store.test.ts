import { AuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createAuthStore } from './store.ts'

const stored = { id: 'u1', email: 'me@example.com' }
const session = { user: { id: 'u1', email: 'me@example.com' } }
const signedIn = { status: 'signedIn', email: 'me@example.com', userId: 'u1' }

function fakeClient() {
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(),
  }
  return { client: { auth } as unknown as SupabaseClient, auth }
}

function make(client: SupabaseClient | null, hasSession: boolean, user: typeof stored | null) {
  return createAuthStore({
    getClient: () => client,
    hasStoredSession: () => hasSession,
    storedUser: () => user,
  })
}

describe('auth store', () => {
  it('guest with no stored session never builds the client', async () => {
    const getClient = vi.fn()
    const store = createAuthStore({
      getClient,
      hasStoredSession: () => false,
      storedUser: () => null,
    })
    expect(store.getState()).toEqual({ status: 'guest' })
    await store.init()
    expect(store.getState()).toEqual({ status: 'guest' })
    expect(getClient).not.toHaveBeenCalled()
  })

  it('restores a stored session', async () => {
    const { client, auth } = fakeClient()
    const store = make(client, true, stored)
    expect(store.getState()).toEqual({ status: 'loading' })
    await store.init()
    expect(auth.getSession).toHaveBeenCalled()
    expect(store.getState()).toEqual(signedIn)
  })

  it('falls back to guest when sync is not configured', async () => {
    const store = make(null, true, stored)
    await store.init()
    expect(store.getState()).toEqual({ status: 'guest' })
    await expect(store.requestCode('me@example.com')).rejects.toThrow('not set up')
  })

  it('requests a code without creating users', async () => {
    const { client, auth } = fakeClient()
    await make(client, false, null).requestCode('me@example.com')
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'me@example.com',
      options: { shouldCreateUser: false },
    })
  })

  it('surfaces request errors', async () => {
    const { client, auth } = fakeClient()
    auth.signInWithOtp.mockResolvedValue({ error: new Error('rate limited') })
    await expect(make(client, false, null).requestCode('me@example.com')).rejects.toThrow(
      'rate limited',
    )
  })

  it('signs in with an email code and notifies subscribers', async () => {
    const { client, auth } = fakeClient()
    const store = make(client, false, null)
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
    const store = make(client, false, null)
    await expect(store.verifyCode('me@example.com', '000000')).rejects.toThrow('bad code')
    expect(store.getState()).toEqual({ status: 'guest' })
  })

  it('rejects a verify that returns no session', async () => {
    const { client, auth } = fakeClient()
    auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: null })
    await expect(make(client, false, null).verifyCode('me@example.com', '123456')).rejects.toThrow(
      'No session',
    )
  })

  it('signs out to guest', async () => {
    const { client, auth } = fakeClient()
    const store = make(client, true, stored)
    await store.init()
    await store.signOut()
    expect(auth.signOut).toHaveBeenCalled()
    expect(store.getState()).toEqual({ status: 'guest' })
  })

  it('clears the local session when the global sign-out fails offline', async () => {
    const { client, auth } = fakeClient()
    auth.signOut.mockResolvedValueOnce({ error: new AuthRetryableFetchError('offline', 0) })
    const store = make(client, true, stored)
    await store.init()
    await store.signOut()
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' })
    expect(store.getState()).toEqual({ status: 'guest' })
  })

  it('clears the local session when sign-out throws', async () => {
    const { client, auth } = fakeClient()
    auth.signOut.mockRejectedValueOnce(new Error('boom'))
    const store = make(client, true, stored)
    await store.init()
    await store.signOut()
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' })
    expect(store.getState()).toEqual({ status: 'guest' })
  })

  it('stays signed in when the token refresh fails offline', async () => {
    const { client, auth } = fakeClient()
    auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('offline', 0),
    })
    const store = make(client, true, stored)
    await store.init()
    expect(store.getState()).toEqual(signedIn)
  })

  it('does not get stuck loading when getSession throws', async () => {
    const { client, auth } = fakeClient()
    auth.getSession.mockRejectedValue(new Error('lock timeout'))
    const withUser = make(client, true, stored)
    await withUser.init()
    expect(withUser.getState()).toEqual(signedIn)
    const noUser = make(client, true, null)
    await noUser.init()
    expect(noUser.getState()).toEqual({ status: 'guest' })
  })

  it('follows auth events, but ignores a null INITIAL_SESSION after an offline restore', async () => {
    const { client, auth } = fakeClient()
    auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('offline', 0),
    })
    const store = make(client, true, stored)
    await store.init()
    const listener = auth.onAuthStateChange.mock.calls[0][0]
    listener('INITIAL_SESSION', null)
    expect(store.getState().status).toBe('signedIn')
    listener('SIGNED_OUT', null)
    expect(store.getState()).toEqual({ status: 'guest' })
    listener('TOKEN_REFRESHED', session)
    expect(store.getState().status).toBe('signedIn')
  })
})
