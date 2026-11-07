import { describe, expect, it } from 'vitest'
import { diaryId, safeUrl, songId } from './journal'

describe('safeUrl', () => {
  it('keeps http and https links', () => {
    expect(safeUrl('https://youtu.be/abc')).toBe('https://youtu.be/abc')
    expect(safeUrl('  http://example.com/a b ')).toBe('http://example.com/a%20b')
  })

  it('drops blanks and unparsable text', () => {
    expect(safeUrl('')).toBeUndefined()
    expect(safeUrl('   ')).toBeUndefined()
    expect(safeUrl(undefined)).toBeUndefined()
    expect(safeUrl('not a url')).toBeUndefined()
  })

  it('drops schemes that could run code', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl('data:text/html,<b>x</b>')).toBeUndefined()
  })
})

describe('ids', () => {
  it('keys a sentence by day and language, a song by week and language', () => {
    expect(diaryId('2026-11-07', 'de')).toBe('2026-11-07:de')
    expect(songId('2026-11-02', 'de')).toBe('2026-11-02:de')
  })
})
