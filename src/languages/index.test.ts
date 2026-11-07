import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getLanguage, languages } from './index.ts'

const de = getLanguage('de')

describe('registry', () => {
  it('has German', () => {
    expect(languages.map((l) => l.code)).toContain('de')
    expect(de.name).toBe('German')
  })

  it('throws on an unknown code', () => {
    expect(() => getLanguage('xx')).toThrow(/xx/)
  })
})

describe('German module', () => {
  it('offers article and plural fields', () => {
    expect(de.extraFields.map((f) => f.key)).toEqual(['article', 'plural'])
  })

  it('renders a noun with its article in the article color', () => {
    const html = renderToStaticMarkup(
      createElement(de.Term, {
        card: { term: 'Hund', extra: { article: 'der', plural: 'Hunde' } },
      }),
    )
    expect(html).toContain('lang="de"')
    expect(html).toMatch(/class="[^"]*de-article--der[^"]*">der</)
    expect(html).toContain('Hund')
  })

  it('speaks German', () => {
    expect(de.speechLang).toBe('de-DE')
  })

  it('links DWDS, Wiktionary and Leo, with the term URL-encoded', () => {
    const links = de.lookupLinks({ term: ' Straße ' })
    expect(links.map((l) => l.label)).toEqual(['DWDS', 'Wiktionary', 'Leo'])
    for (const l of links) {
      expect(l.url).toMatch(/^https:\/\//)
      expect(l.url).toContain('Stra%C3%9Fe')
      expect(l.url).not.toContain(' ')
    }
  })

  it('renders a term without an article as-is', () => {
    const html = renderToStaticMarkup(
      createElement(de.Term, { card: { term: 'gehen', extra: {} } }),
    )
    expect(html).not.toContain('de-article')
    expect(html).toContain('gehen')
  })

  it('searches by article, term, plural and translation', () => {
    const text = de.searchText({
      term: 'Hund',
      translation: 'dog',
      extra: { article: 'der', plural: 'Hunde' },
    })
    expect(text).toBe('der hund hunde dog')
  })
})

describe('article rules stay in the German module', () => {
  const sources = import.meta.glob<string>('/src/**/*.{ts,tsx,css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  })
  const files = Object.entries(sources).filter(
    ([path]) => !path.startsWith('/src/languages/de/') && !path.endsWith('.test.ts'),
  )

  it('scans the app source', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(files)('%s has no der/die/das', (_, text) => {
    expect(text).not.toMatch(/\b(der|die|das)\b/i)
  })
})
