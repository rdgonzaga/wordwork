import { describe, expect, it } from 'vitest'
import type { Schedule } from '../../db/schema'
import type { DaySettings } from '../day'
import { formatInterval, preview, previewAll } from './preview'
import { newSchedule } from './scheduler'

const settings: DaySettings = { timeZone: 'Asia/Manila', rolloverHour: 4 }
const NOON = new Date('2026-11-07T04:00:00Z')

describe('formatInterval', () => {
  it.each([
    [{ minutes: 1 }, '1m'],
    [{ minutes: 10 }, '10m'],
    [{ minutes: 90 }, '1.5h'],
    [{ days: 1 }, '1d'],
    [{ days: 4 }, '4d'],
    [{ days: 29 }, '29d'],
    [{ days: 30 }, '1mo'],
    [{ days: 70 }, '2.3mo'],
    [{ days: 365 }, '1y'],
  ])('%o → %s', (input, label) => {
    expect(formatInterval(input)).toBe(label)
  })
})

describe('preview', () => {
  it('labels each button for a new card', () => {
    expect(previewAll(newSchedule('c'), NOON, settings)).toEqual({
      1: '1m',
      2: '1m',
      3: '10m',
      4: '4d',
    })
  })

  it('labels a review card in days or months', () => {
    const s: Schedule = {
      ...newSchedule('c'),
      state: 'review',
      intervalDays: 10,
      dueDay: '2026-11-07',
      reps: 5,
    }
    expect(preview(s, 1, NOON, settings)).toBe('10m')
    expect(preview(s, 3, NOON, settings)).toMatch(/^2[3-7]d$/)
    expect(preview(s, 4, NOON, settings)).toMatch(/^1(\.1)?mo$/)
  })
})
