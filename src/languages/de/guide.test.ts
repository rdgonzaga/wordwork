import { describe, expect, it } from 'vitest'
import { tickId } from '../../db/ticks'
import { blocks, daily, milestones, setup } from './guide'

const all = [
  ...Object.values(daily).flat(),
  ...blocks.flatMap((b) => b.items),
  ...setup,
  ...milestones.flatMap((m) => m.items),
]

describe('guide content', () => {
  it('uses ids the server accepts, daily ones included', () => {
    for (const item of all) expect(() => tickId(item.id, '2026-11-09')).not.toThrow()
  })

  it('never reuses an id outside the daily lists', () => {
    const once = all.filter((i) => !i.id.startsWith('daily.')).map((i) => i.id)
    expect(new Set(once).size).toBe(once.length)
  })
})
