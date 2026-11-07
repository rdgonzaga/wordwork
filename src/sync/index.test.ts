import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'

const getClient = vi.fn()
vi.mock('../auth/client.ts', () => ({
  getClient: () => getClient(),
  hasStoredSession: () => false,
  readStoredUser: () => null,
  isSyncConfigured: () => true,
}))

describe('syncNow', () => {
  it('does nothing and never builds the client for a guest', async () => {
    const { syncNow } = await import('./index.ts')
    await expect(syncNow()).resolves.toBeUndefined()
    expect(getClient).not.toHaveBeenCalled()
  })
})
