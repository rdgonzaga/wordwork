import { beforeEach, describe, expect, it } from 'vitest'
import { getStoredLanguage, pickLanguage, setActiveLanguage } from './language.ts'

describe('pickLanguage', () => {
  it('keeps the stored pick when that language has a deck', () => {
    expect(pickLanguage('ja', ['de', 'ja'])).toBe('ja')
  })

  it('falls back to the first language with a deck', () => {
    expect(pickLanguage('it', ['de', 'ja'])).toBe('de')
    expect(pickLanguage(null, ['it', 'ja'])).toBe('it')
  })

  it('is undefined while no language has a deck', () => {
    expect(pickLanguage('de', [])).toBeUndefined()
  })
})

describe('stored language', () => {
  beforeEach(() => {
    const data = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    } as Storage
  })

  it('remembers the pick', () => {
    setActiveLanguage('it')
    expect(getStoredLanguage()).toBe('it')
  })
})
