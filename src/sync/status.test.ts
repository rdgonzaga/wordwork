import { describe, expect, it, vi } from 'vitest'
import { createSyncStatus, isOfflineError } from './status'

describe('isOfflineError', () => {
  it('is offline when the browser says so', () => {
    expect(isOfflineError(new Error('anything'), false)).toBe(true)
  })

  it('recognizes fetch failures from the browsers', () => {
    expect(isOfflineError(new Error('TypeError: Failed to fetch'))).toBe(true)
    expect(isOfflineError(new Error('Load failed'))).toBe(true)
    expect(isOfflineError(new Error('NetworkError when attempting to fetch resource.'))).toBe(true)
  })

  it('does not treat server errors as offline', () => {
    expect(isOfflineError(new Error('JWT expired'))).toBe(false)
    expect(isOfflineError('boom')).toBe(false)
  })
})

describe('createSyncStatus', () => {
  it('starts idle', () => {
    expect(createSyncStatus().getState()).toEqual({ phase: 'idle' })
  })

  it('goes syncing, then idle with the finish time', () => {
    const s = createSyncStatus()
    s.started()
    expect(s.getState().phase).toBe('syncing')
    s.finished(1_000)
    expect(s.getState()).toEqual({ phase: 'idle', lastSyncedAt: 1_000 })
  })

  it('reports rows the server rejected as an error', () => {
    const s = createSyncStatus()
    s.started()
    s.finished(1_000, 2)
    expect(s.getState()).toMatchObject({ phase: 'error', message: "2 rows couldn't sync." })
    s.started()
    s.finished(2_000, 1)
    expect(s.getState().message).toBe("1 row couldn't sync.")
  })

  it('goes offline on a network failure and keeps the last good time', () => {
    const s = createSyncStatus()
    s.finished(1_000)
    s.started()
    s.failed(new Error('Failed to fetch'))
    expect(s.getState()).toEqual({ phase: 'offline', lastSyncedAt: 1_000, message: undefined })
  })

  it('goes offline when the browser is offline whatever the error', () => {
    const s = createSyncStatus()
    s.failed(new Error('weird'), false)
    expect(s.getState().phase).toBe('offline')
  })

  it('keeps the message for other failures', () => {
    const s = createSyncStatus()
    s.failed(new Error('This device is synced to a different account.'))
    expect(s.getState()).toMatchObject({
      phase: 'error',
      message: 'This device is synced to a different account.',
    })
  })

  it('clears an old error when a new sync starts', () => {
    const s = createSyncStatus()
    s.failed(new Error('nope'))
    s.started()
    expect(s.getState()).toMatchObject({ phase: 'syncing', message: undefined })
  })

  it('notifies subscribers until they unsubscribe', () => {
    const s = createSyncStatus()
    const fn = vi.fn()
    const off = s.subscribe(fn)
    s.started()
    s.finished(1)
    expect(fn).toHaveBeenCalledTimes(2)
    off()
    s.started()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
