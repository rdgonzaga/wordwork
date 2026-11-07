import { describe, expect, it } from 'vitest'
import { toDay, type DayKey } from './day'
import { dayTotals } from './minutes'
import { streakState } from './streak'

const MANILA = { timeZone: 'Asia/Manila', rolloverHour: 4 }
const TODAY = '2026-11-10'

/** Totals for days given as offsets back from TODAY: `{ 0: 10, 2: 25 }` is today and two days ago. */
function totals(byOffset: Record<number, number>): Map<DayKey, number> {
  const map = new Map<DayKey, number>()
  for (const [offset, minutes] of Object.entries(byOffset)) {
    const date = new Date(`${TODAY}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - Number(offset))
    map.set(date.toISOString().slice(0, 10), minutes)
  }
  return map
}

const state = (byOffset: Record<number, number>) => streakState(totals(byOffset), TODAY, 10)

describe('streakState', () => {
  it('is zero with nothing logged', () => {
    expect(state({})).toEqual({ streak: 0, atRisk: false })
  })

  it('counts consecutive hit days including today', () => {
    expect(state({ 0: 10, 1: 15, 2: 30 }).streak).toBe(3)
  })

  it('does not treat today as missed while it is in progress', () => {
    expect(state({ 1: 10, 2: 10, 3: 10 })).toEqual({ streak: 3, atRisk: false })
  })

  it('counts 10 minutes as a hit and 9 as a miss', () => {
    expect(state({ 0: 10 }).streak).toBe(1)
    expect(state({ 0: 9 }).streak).toBe(0)
    expect(state({ 1: 9, 2: 10 }).streak).toBe(1)
  })

  it('bridges a single missed day without counting it', () => {
    expect(state({ 0: 10, 2: 10, 3: 10 }).streak).toBe(3)
  })

  it('ends the run after two missed days in a row', () => {
    expect(state({ 0: 10, 3: 10, 4: 10 }).streak).toBe(1)
  })

  it('keeps every-other-day alive', () => {
    expect(state({ 0: 10, 2: 10, 4: 10, 6: 10 }).streak).toBe(4)
  })

  it('bridges a missed day right behind yesterday', () => {
    expect(state({ 1: 10, 3: 10 }).streak).toBe(2)
  })

  it('is zero when yesterday and the day before were both missed', () => {
    expect(state({ 3: 10, 4: 10 })).toEqual({ streak: 0, atRisk: false })
  })

  it('stops at the first double gap even with older hits', () => {
    expect(state({ 1: 10, 4: 10, 5: 10, 6: 10 }).streak).toBe(1)
  })

  it('sums minutes split across entries before checking the threshold', () => {
    const rows = [
      { day: TODAY, minutes: 4, deleted: false },
      { day: TODAY, minutes: 6, deleted: false },
    ]
    expect(streakState(dayTotals(rows), TODAY, 10).streak).toBe(1)
  })

  it('ignores deleted entries', () => {
    const rows = [
      { day: TODAY, minutes: 10, deleted: true },
      { day: TODAY, minutes: 5, deleted: false },
    ]
    expect(streakState(dayTotals(rows), TODAY, 10).streak).toBe(0)
  })

  it('uses the threshold it is given', () => {
    expect(streakState(totals({ 0: 15 }), TODAY, 20).streak).toBe(0)
    expect(streakState(totals({ 0: 20 }), TODAY, 20).streak).toBe(1)
  })
})

describe('streakState warning', () => {
  it('warns when yesterday was missed and today is under the threshold', () => {
    expect(state({ 2: 10, 3: 10, 4: 10 })).toEqual({ streak: 3, atRisk: true })
    expect(state({ 0: 9, 2: 10, 3: 10 })).toEqual({ streak: 2, atRisk: true })
  })

  it('clears once today reaches the threshold', () => {
    expect(state({ 0: 10, 2: 10, 3: 10 })).toEqual({ streak: 3, atRisk: false })
  })

  it('stays off when yesterday was a hit', () => {
    expect(state({ 1: 10, 2: 10 }).atRisk).toBe(false)
  })

  it('stays off when there is no streak left to lose', () => {
    expect(state({ 3: 10 }).atRisk).toBe(false)
  })
})

describe('streakState with study days', () => {
  const rowAt = (iso: string, minutes: number) => ({
    day: toDay(new Date(iso), MANILA),
    minutes,
    deleted: false,
  })

  it('files time before the 4 AM rollover under the previous day', () => {
    // 03:59 Manila on the 10th is still the 9th, 04:00 is the 10th.
    const rows = [rowAt('2026-11-09T19:59:59Z', 10), rowAt('2026-11-09T20:00:00Z', 10)]
    const totalsByDay = dayTotals(rows)
    expect(totalsByDay.get('2026-11-09')).toBe(10)
    expect(totalsByDay.get('2026-11-10')).toBe(10)
    expect(streakState(totalsByDay, '2026-11-10', 10).streak).toBe(2)
  })

  it('does not bridge a day just because the late session crossed midnight', () => {
    // Two sessions 00:30 and 01:30 Manila on the 10th both belong to the 9th.
    const rows = [rowAt('2026-11-09T16:30:00Z', 5), rowAt('2026-11-09T17:30:00Z', 5)]
    const totalsByDay = dayTotals(rows)
    expect(totalsByDay.get('2026-11-09')).toBe(10)
    expect(streakState(totalsByDay, '2026-11-09', 10).streak).toBe(1)
  })
})
