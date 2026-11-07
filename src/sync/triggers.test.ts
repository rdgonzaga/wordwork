import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDb, type WordworkDb } from '../db/schema'
import { startSyncTriggers } from './triggers'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const DEBOUNCE = 30

function fakeTarget() {
  const handlers = new Map<string, Set<() => void>>()
  return {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener(type: string, fn: () => void) {
      if (!handlers.has(type)) handlers.set(type, new Set())
      handlers.get(type)!.add(fn)
    },
    removeEventListener(type: string, fn: () => void) {
      handlers.get(type)?.delete(fn)
    },
    emit(type: string) {
      handlers.get(type)?.forEach((fn) => fn())
    },
    count: (type: string) => handlers.get(type)?.size ?? 0,
  }
}

const minutesRow = (id: string, dirty: 0 | 1 = 1) => ({
  id,
  day: '2026-11-07',
  minutes: 10,
  source: 'manual' as const,
  createdAt: 1,
  updatedAt: 1,
  deleted: false,
  dirty,
})

let db: WordworkDb
let sync: ReturnType<typeof vi.fn>
let signedIn: boolean
let authListeners: Set<() => void>
let win: ReturnType<typeof fakeTarget>
let doc: ReturnType<typeof fakeTarget>
let stop: () => void

function start() {
  stop = startSyncTriggers({
    db,
    sync: sync as () => Promise<unknown>,
    isSignedIn: () => signedIn,
    onAuthChange: (fn) => {
      authListeners.add(fn)
      return () => authListeners.delete(fn)
    },
    win: win as unknown as Window,
    doc: doc as unknown as Document,
    debounceMs: DEBOUNCE,
  })
}

beforeEach(() => {
  db = createDb(`triggers-${Math.random()}`)
  sync = vi.fn().mockResolvedValue(undefined)
  signedIn = true
  authListeners = new Set()
  win = fakeTarget()
  doc = fakeTarget()
})

afterEach(async () => {
  stop?.()
  db.close()
})

describe('startSyncTriggers', () => {
  it('syncs on start when signed in', () => {
    start()
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('does nothing for a guest', async () => {
    signedIn = false
    start()
    doc.emit('visibilitychange')
    win.emit('online')
    await db.minutes.put(minutesRow('a'))
    await wait(DEBOUNCE * 3)
    expect(sync).not.toHaveBeenCalled()
  })

  it('syncs when the user signs in, once', () => {
    signedIn = false
    start()
    signedIn = true
    authListeners.forEach((fn) => fn())
    authListeners.forEach((fn) => fn())
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('syncs when the tab becomes visible, not when it hides', () => {
    start()
    sync.mockClear()
    doc.visibilityState = 'hidden'
    doc.emit('visibilitychange')
    expect(sync).not.toHaveBeenCalled()
    doc.visibilityState = 'visible'
    doc.emit('visibilitychange')
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('syncs when the browser comes back online', () => {
    start()
    sync.mockClear()
    win.emit('online')
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('syncs once after a burst of local writes goes quiet', async () => {
    start()
    sync.mockClear()
    await db.minutes.put(minutesRow('a'))
    await wait(DEBOUNCE / 2)
    await db.minutes.put(minutesRow('b'))
    await wait(DEBOUNCE / 2)
    expect(sync).not.toHaveBeenCalled()
    await wait(DEBOUNCE * 2)
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('counts an edit to a row that is already dirty', async () => {
    await db.minutes.put(minutesRow('a'))
    start()
    sync.mockClear()
    await db.minutes.update('a', { minutes: 20, updatedAt: 2 })
    await wait(DEBOUNCE * 3)
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('ignores clean rows from a pull and the dirty flag being cleared', async () => {
    await db.minutes.put(minutesRow('a'))
    start()
    sync.mockClear()
    await db.minutes.bulkPut([minutesRow('b', 0)])
    await db.minutes.update('a', { dirty: 0 })
    await wait(DEBOUNCE * 3)
    expect(sync).not.toHaveBeenCalled()
  })

  it('stops cleanly', async () => {
    start()
    sync.mockClear()
    stop()
    doc.emit('visibilitychange')
    win.emit('online')
    await db.minutes.put(minutesRow('a'))
    await wait(DEBOUNCE * 3)
    expect(sync).not.toHaveBeenCalled()
    expect(doc.count('visibilitychange')).toBe(0)
    expect(win.count('online')).toBe(0)
    expect(authListeners.size).toBe(0)
  })

  it('swallows a failed sync', () => {
    sync.mockRejectedValue(new Error('offline'))
    expect(() => start()).not.toThrow()
  })
})
