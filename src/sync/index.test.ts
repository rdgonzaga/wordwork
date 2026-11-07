import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getClient = vi.fn()
const getState = vi.fn()
const runSync = vi.fn()

vi.mock('../auth/client.ts', () => ({ getClient: () => getClient() }))
vi.mock('../auth/index.ts', () => ({ auth: { getState: () => getState() } }))
vi.mock('./remote.ts', () => ({ supabaseRemote: () => ({}) }))
vi.mock('./engine.ts', () => ({ runSync: (...args: unknown[]) => runSync(...args) }))

const result = { pushed: 0, pulled: 0, failed: [] }

beforeEach(() => {
  vi.resetModules()
  getClient.mockReset()
  getState.mockReset()
  runSync.mockReset()
})

describe('syncNow', () => {
  it('does nothing and never builds the client for a guest', async () => {
    getState.mockReturnValue({ status: 'guest' })
    const { syncNow } = await import('./index.ts')
    await expect(syncNow()).resolves.toBeUndefined()
    expect(getClient).not.toHaveBeenCalled()
    expect(runSync).not.toHaveBeenCalled()
  })

  it('syncs when signed in', async () => {
    getState.mockReturnValue({ status: 'signedIn', email: 'a@b.c', userId: 'u1' })
    getClient.mockReturnValue({})
    runSync.mockResolvedValue(result)
    const { syncNow } = await import('./index.ts')
    await expect(syncNow()).resolves.toBe(result)
    expect(runSync).toHaveBeenCalledTimes(1)
    expect(runSync.mock.calls[0][2]).toBe('u1')
  })

  it('shares a running sync and runs once more for calls made during it', async () => {
    getState.mockReturnValue({ status: 'signedIn', email: 'a@b.c', userId: 'u1' })
    getClient.mockReturnValue({})
    let release!: () => void
    runSync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(result)
        }),
    )
    runSync.mockResolvedValue(result)

    const { syncNow } = await import('./index.ts')
    const first = syncNow()
    const second = syncNow()
    const third = syncNow()
    expect(second).toBe(first)
    expect(third).toBe(first)
    release()
    await first
    expect(runSync).toHaveBeenCalledTimes(2)

    // And a fresh call after it finishes starts a new sync.
    await syncNow()
    expect(runSync).toHaveBeenCalledTimes(3)
  })
})
