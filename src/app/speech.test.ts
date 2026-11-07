import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Speak from './Speak.tsx'
import { hasVoice } from './speech.ts'

describe('hasVoice', () => {
  it('matches the exact tag', () => {
    expect(hasVoice([{ lang: 'de-DE' }], 'de-DE')).toBe(true)
  })

  it('accepts another region of the same language', () => {
    expect(hasVoice([{ lang: 'de-AT' }], 'de-DE')).toBe(true)
  })

  it('reads Android-style underscores and any case', () => {
    expect(hasVoice([{ lang: 'de_DE' }], 'de-DE')).toBe(true)
    expect(hasVoice([{ lang: 'DE-de' }], 'de-DE')).toBe(true)
  })

  it('is false for other languages and an empty list', () => {
    expect(hasVoice([{ lang: 'en-US' }, { lang: 'fr-FR' }], 'de-DE')).toBe(false)
    expect(hasVoice([], 'de-DE')).toBe(false)
  })
})

describe('Speak', () => {
  it('renders nothing without speech synthesis', () => {
    expect(renderToStaticMarkup(createElement(Speak, { text: 'Haus', lang: 'de-DE' }))).toBe('')
  })
})
