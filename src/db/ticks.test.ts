import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDb, type WordworkDb } from './schema'
import { listTicks, setTick, tickId } from './ticks'

let db: WordworkDb
const t = (ms: number) => new Date(ms)

beforeEach(() => {
  db = createDb(`ticks-${Math.random()}`)
})

describe('tickId', () => {
  it('prefixes daily items with the day', () => {
    expect(tickId('daily.input', '2026-11-09')).toBe('2026-11-09:daily.input')
    expect(tickId('setup.placement')).toBe('setup.placement')
  })

  it('refuses ids the server would reject', () => {
    expect(() => tickId('Daily_Input')).toThrow()
    expect(() => tickId('x'.repeat(70), '2026-11-09')).toThrow()
  })
})

describe('setTick', () => {
  it('ticks an item as a dirty row', async () => {
    await setTick(db, 'setup.placement', true, t(1_000))
    expect(await db.ticks.get('setup.placement')).toEqual({
      id: 'setup.placement',
      updatedAt: 1_000,
      deleted: false,
      dirty: 1,
    })
    expect(await listTicks(db)).toEqual(new Set(['setup.placement']))
  })

  it('stores the day on daily ticks', async () => {
    await setTick(db, 'daily.input', true, t(1_000), '2026-11-09')
    expect(await db.ticks.get('2026-11-09:daily.input')).toMatchObject({ day: '2026-11-09' })
  })

  it('unticks with a tombstone and can tick again', async () => {
    await setTick(db, 'm1.verbs', true, t(5_000))
    await setTick(db, 'm1.verbs', false, t(1_000))
    let row = await db.ticks.get('m1.verbs')
    expect(row).toMatchObject({ deleted: true, dirty: 1 })
    expect(row!.updatedAt).toBeGreaterThan(5_000)
    expect(await listTicks(db)).toEqual(new Set())

    await setTick(db, 'm1.verbs', true, t(9_000))
    row = await db.ticks.get('m1.verbs')
    expect(row).toMatchObject({ deleted: false, updatedAt: 9_000 })
  })

  it('does nothing when the state already matches', async () => {
    await setTick(db, 'x', false, t(1_000))
    expect(await db.ticks.count()).toBe(0)

    await setTick(db, 'x', true, t(1_000))
    await db.ticks.update('x', { dirty: 0 })
    await setTick(db, 'x', true, t(2_000))
    expect(await db.ticks.get('x')).toMatchObject({ updatedAt: 1_000, dirty: 0 })
  })
})
