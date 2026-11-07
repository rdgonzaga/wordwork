import { describe, expect, it } from 'vitest'
import { heatmap, level } from './heatmap'

// 2026-11-11 is a Wednesday.
const TODAY = '2026-11-11'

describe('level', () => {
  it('is 0 for no time and steps up from there', () => {
    expect(level(0, 10)).toBe(0)
    expect(level(1, 10)).toBe(1)
    expect(level(9, 10)).toBe(1)
    expect(level(10, 10)).toBe(2)
    expect(level(29, 10)).toBe(2)
    expect(level(30, 10)).toBe(3)
    expect(level(59, 10)).toBe(3)
    expect(level(60, 10)).toBe(4)
    expect(level(600, 10)).toBe(4)
  })
})

describe('heatmap', () => {
  const weeks = heatmap(new Map(), TODAY, 10)

  it('is 16 weeks of 7 days', () => {
    expect(weeks).toHaveLength(16)
    for (const week of weeks) expect(week).toHaveLength(7)
  })

  it('starts each week on Monday', () => {
    expect(weeks[15][0].day).toBe('2026-11-09')
    expect(weeks[15][6].day).toBe('2026-11-15')
    expect(weeks[0][0].day).toBe('2026-07-27')
  })

  it('has no gaps or repeats between days', () => {
    const days = weeks.flat().map((c) => c.day)
    expect(days).toEqual([...days].sort())
    expect(new Set(days).size).toBe(days.length)
  })

  it('marks days after today as future', () => {
    const last = weeks[15]
    expect(last.map((c) => c.future)).toEqual([false, false, false, true, true, true, true])
    expect(
      weeks
        .slice(0, 15)
        .flat()
        .some((c) => c.future),
    ).toBe(false)
  })

  it('flags today', () => {
    expect(
      weeks
        .flat()
        .filter((c) => c.today)
        .map((c) => c.day),
    ).toEqual([TODAY])
  })

  it('takes minutes and levels from the totals', () => {
    const totals = new Map([
      [TODAY, 25],
      ['2026-11-09', 5],
      ['2026-07-27', 90],
    ])
    const grid = heatmap(totals, TODAY, 10)
    expect(grid[15][2]).toMatchObject({ day: TODAY, minutes: 25, level: 2 })
    expect(grid[15][0]).toMatchObject({ minutes: 5, level: 1 })
    expect(grid[15][1]).toMatchObject({ minutes: 0, level: 0 })
    expect(grid[0][0]).toMatchObject({ minutes: 90, level: 4 })
  })

  it('ignores time older than the window', () => {
    const grid = heatmap(new Map([['2026-07-26', 60]]), TODAY, 10)
    expect(grid.flat().every((c) => c.minutes === 0)).toBe(true)
  })

  it('puts a Monday today in the first row of the last column', () => {
    const grid = heatmap(new Map(), '2026-11-09', 10)
    expect(grid[15][0]).toMatchObject({ day: '2026-11-09', today: true, future: false })
    expect(grid[15].slice(1).every((c) => c.future)).toBe(true)
  })

  it('puts a Sunday today in the last row of the last column', () => {
    const grid = heatmap(new Map(), '2026-11-15', 10)
    expect(grid[15][6]).toMatchObject({ day: '2026-11-15', today: true })
    expect(grid[15].some((c) => c.future)).toBe(false)
  })
})
