import { describe, expect, it } from 'vitest'
import { toDay, type DaySettings } from './day'

const manila = (rolloverHour: number): DaySettings => ({ timeZone: 'Asia/Manila', rolloverHour })
const at = (iso: string) => new Date(iso)

describe('toDay', () => {
  describe('Manila midnight, no rollover', () => {
    it('23:59:59 is still the 6th', () => {
      expect(toDay(at('2026-11-06T15:59:59Z'), manila(0))).toBe('2026-11-06')
    })

    it('00:00:00 is the 7th', () => {
      expect(toDay(at('2026-11-06T16:00:00Z'), manila(0))).toBe('2026-11-07')
    })
  })

  describe('Manila 4 AM rollover', () => {
    it('midnight is still yesterday', () => {
      expect(toDay(at('2026-11-06T16:00:00Z'), manila(4))).toBe('2026-11-06')
    })

    it('1:30 AM is still yesterday', () => {
      expect(toDay(at('2026-11-06T17:30:00Z'), manila(4))).toBe('2026-11-06')
    })

    it('03:59:59 is still yesterday', () => {
      expect(toDay(at('2026-11-06T19:59:59Z'), manila(4))).toBe('2026-11-06')
    })

    it('04:00:00 is today', () => {
      expect(toDay(at('2026-11-06T20:00:00Z'), manila(4))).toBe('2026-11-07')
    })

    it('rolls back across a year boundary', () => {
      expect(toDay(at('2026-12-31T18:00:00Z'), manila(4))).toBe('2026-12-31')
    })

    it('rolls back across a month boundary', () => {
      expect(toDay(at('2026-02-28T17:00:00Z'), manila(4))).toBe('2026-02-28')
      expect(toDay(at('2026-02-28T20:00:00Z'), manila(4))).toBe('2026-03-01')
    })
  })

  describe('rollover uses the wall clock across DST changes', () => {
    const ny: DaySettings = { timeZone: 'America/New_York', rolloverHour: 4 }

    it('fall back: 03:30 EST is still yesterday', () => {
      // 2026-11-01 02:00 EDT -> 01:00 EST; 08:30Z = 03:30 EST
      expect(toDay(at('2026-11-01T08:30:00Z'), ny)).toBe('2026-10-31')
    })

    it('spring forward: 04:30 EDT is today', () => {
      // 2026-03-08 02:00 EST -> 03:00 EDT; 08:30Z = 04:30 EDT
      expect(toDay(at('2026-03-08T08:30:00Z'), ny)).toBe('2026-03-08')
    })
  })

  it('uses the settings zone, not the device zone', () => {
    const instant = at('2026-11-06T16:00:00Z')
    expect(toDay(instant, { timeZone: 'UTC', rolloverHour: 0 })).toBe('2026-11-06')
    expect(toDay(instant, manila(0))).toBe('2026-11-07')
  })
})
