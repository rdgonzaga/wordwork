import { describe, expect, it } from 'vitest'
import { autoTicks, currentWeek, dayKind } from './guide'

describe('currentWeek', () => {
  it('counts 7-day weeks from the start day', () => {
    expect(currentWeek('2026-11-07', '2026-11-07')).toBe(1)
    expect(currentWeek('2026-11-07', '2026-11-13')).toBe(1)
    expect(currentWeek('2026-11-07', '2026-11-14')).toBe(2)
    expect(currentWeek('2026-11-07', '2027-01-02')).toBe(9)
  })

  it('treats days before the start as week 1', () => {
    expect(currentWeek('2026-11-07', '2026-11-01')).toBe(1)
  })
})

describe('dayKind', () => {
  it('splits Saturday and Sunday from the rest', () => {
    expect(dayKind('2026-11-09')).toBe('weekday') // Monday
    expect(dayKind('2026-11-13')).toBe('weekday') // Friday
    expect(dayKind('2026-11-14')).toBe('saturday')
    expect(dayKind('2026-11-15')).toBe('sunday')
  })
})

describe('autoTicks', () => {
  const none = {
    queueLeft: 5,
    reviewedToday: 0,
    reviewedCards: 0,
    diaryToday: false,
    songThisWeek: false,
  }

  it('ticks nothing on a fresh day', () => {
    expect(autoTicks(none)).toEqual(new Set())
  })

  it('ticks reviews only once the queue is empty and something was reviewed', () => {
    expect(autoTicks({ ...none, queueLeft: 0 }).has('daily.reviews')).toBe(false)
    expect(autoTicks({ ...none, reviewedToday: 3 }).has('daily.reviews')).toBe(false)
    expect(autoTicks({ ...none, queueLeft: 0, reviewedToday: 3 }).has('daily.reviews')).toBe(true)
  })

  it('ticks the sentence, the song and the first ten cards', () => {
    const got = autoTicks({ ...none, diaryToday: true, songThisWeek: true, reviewedCards: 10 })
    expect(got).toEqual(new Set(['daily.sentence', 'daily.song', 'setup.first-cards']))
    expect(autoTicks({ ...none, reviewedCards: 9 }).has('setup.first-cards')).toBe(false)
  })
})
