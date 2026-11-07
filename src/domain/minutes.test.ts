import { describe, expect, it } from 'vitest'
import { REVIEW_IDLE_CAP_MS, activeMs, formatHours, progress, totalMinutes } from './minutes'

describe('totalMinutes', () => {
  it('sums rows and skips deleted ones', () => {
    const rows = [
      { minutes: 10, deleted: false },
      { minutes: 40, deleted: false },
      { minutes: 99, deleted: true },
    ]
    expect(totalMinutes(rows)).toBe(50)
    expect(totalMinutes([])).toBe(0)
  })
})

describe('activeMs', () => {
  it('passes normal times through', () => {
    expect(activeMs(8_000)).toBe(8_000)
  })

  it('caps a card left open', () => {
    expect(activeMs(10 * 60_000)).toBe(REVIEW_IDLE_CAP_MS)
  })

  it('ignores negative and non-finite values', () => {
    expect(activeMs(-5)).toBe(0)
    expect(activeMs(Number.NaN)).toBe(0)
    expect(activeMs(Infinity)).toBe(0)
  })
})

describe('progress', () => {
  it('is a whole percent of the goal', () => {
    expect(progress(60 * 100, 400)).toEqual({ hours: 100, goalHours: 400, percent: 25 })
    expect(progress(59, 400).percent).toBe(0)
  })

  it('stops at 100 past the goal', () => {
    expect(progress(60 * 500, 400).percent).toBe(100)
  })

  it('does not divide by a zero goal', () => {
    expect(progress(600, 0).percent).toBe(0)
  })
})

describe('formatHours', () => {
  it('shows one decimal only when needed', () => {
    expect(formatHours(0)).toBe('0')
    expect(formatHours(90)).toBe('1.5')
    expect(formatHours(120)).toBe('2')
    expect(formatHours(65)).toBe('1.1')
  })
})
