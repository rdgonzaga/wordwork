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

describe('Italian module', () => {
  const it_ = getLanguage('it')

  it('offers article and plural fields, with the elided article as a choice', () => {
    expect(it_.extraFields.map((f) => f.key)).toEqual(['article', 'plural'])
    expect(it_.extraFields[0].options).toContain("l'")
  })

  it('renders an article before the term, with no space after l’', () => {
    const render = (article: string, term: string) =>
      renderToStaticMarkup(createElement(it_.Term, { card: { term, extra: { article } } }))
    expect(render('il', 'libro')).toContain('il libro')
    // the apostrophe is HTML-escaped in the markup
    expect(render("l'", 'amico')).toContain('l&#x27;amico')
    expect(render('il', 'libro')).toContain('lang="it"')
  })

  it('speaks Italian and links WordReference, Wiktionary and Treccani', () => {
    expect(it_.speechLang).toBe('it-IT')
    const links = it_.lookupLinks({ term: ' città ' })
    expect(links.map((l) => l.label)).toEqual(['WordReference', 'Wiktionary', 'Treccani'])
    for (const l of links) expect(l.url).toContain('citt%C3%A0')
  })

  it('searches by article, term, plural and translation', () => {
    const text = it_.searchText({
      term: 'libro',
      translation: 'book',
      extra: { article: 'il', plural: 'libri' },
    })
    expect(text).toBe('il libro libri book')
  })

  it('has a starter deck of nouns that all carry an article', () => {
    const nouns = it_.seed!.cards.filter((c) => c.tags.includes('noun'))
    expect(nouns.length).toBeGreaterThan(10)
    for (const c of nouns) expect(it_.extraFields[0].options, c.term).toContain(c.extra.article)
  })
})

describe('Japanese module', () => {
  const ja = getLanguage('ja')

  it('has a reading field', () => {
    expect(ja.extraFields.map((f) => f.key)).toEqual(['reading'])
  })

  it('renders furigana when a reading differs from the term', () => {
    const html = renderToStaticMarkup(
      createElement(ja.Term, { card: { term: '食べる', extra: { reading: 'たべる' } } }),
    )
    expect(html).toContain('lang="ja"')
    expect(html).toContain('<ruby>食べる<rt>たべる</rt></ruby>')
  })

  it('renders plain kana without ruby', () => {
    for (const extra of [{}, { reading: 'はい' }] as Record<string, string>[]) {
      const html = renderToStaticMarkup(createElement(ja.Term, { card: { term: 'はい', extra } }))
      expect(html).not.toContain('<ruby>')
      expect(html).toContain('はい')
    }
  })

  it('speaks Japanese and links Jisho and Wiktionary', () => {
    expect(ja.speechLang).toBe('ja-JP')
    const links = ja.lookupLinks({ term: '猫' })
    expect(links.map((l) => l.label)).toEqual(['Jisho', 'Wiktionary'])
    for (const l of links) expect(l.url).toContain('%E7%8C%AB')
  })

  it('searches by term, reading and translation', () => {
    expect(ja.searchText({ term: '猫', translation: 'cat', extra: { reading: 'ねこ' } })).toBe(
      '猫 ねこ cat',
    )
  })

  it('has a starter deck with a reading on every kanji term', () => {
    const kanji = /[一-鿿]/
    const cards = ja.seed!.cards.filter((c) => kanji.test(c.term))
    expect(cards.length).toBeGreaterThan(10)
    for (const c of cards) expect(c.extra.reading, c.term).toBeTruthy()
  })
})

describe('registry rules', () => {
  it('registers each code once, each with a starter deck', () => {
    const codes = languages.map((l) => l.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toEqual(['de', 'it', 'ja'])
    for (const l of languages) expect(l.seed, l.code).toBeDefined()
  })

  it('keeps seed deck keys and card terms unique', () => {
    const keys = languages.map((l) => l.seed!.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const l of languages) {
      const terms = l.seed!.cards.map((c) => c.term)
      expect(new Set(terms).size, l.code).toBe(terms.length)
    }
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

describe('german drill', () => {
  const drill = de.drill!
  const card = (extra: Record<string, string>) => ({
    id: '1',
    term: 'Hund',
    translation: 'dog',
    extra,
  })

  it('asks for the article', () => {
    expect(drill.choices).toEqual(['der', 'die', 'das'])
    expect(drill.answer(card({ article: 'der' }))).toBe('der')
  })

  it('skips cards with no usable article', () => {
    expect(drill.answer(card({}))).toBeUndefined()
    expect(drill.answer(card({ article: '' }))).toBeUndefined()
    expect(drill.answer(card({ article: 'ein' }))).toBeUndefined()
  })
})
