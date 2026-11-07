import type { LanguageModule } from '../index.ts'
import { starterDeck } from './seed.ts'
import Term from './Term.tsx'

export const ARTICLES = ['il', 'lo', 'la', "l'", 'i', 'gli', 'le'] as const

export const italian: LanguageModule = {
  code: 'it',
  name: 'Italian',
  extraFields: [
    { key: 'article', label: 'Article', type: 'select', options: ARTICLES },
    { key: 'plural', label: 'Plural', type: 'text' },
  ],
  Term,
  speechLang: 'it-IT',
  lookupLinks: (card) => {
    const word = encodeURIComponent(card.term.trim())
    return [
      { label: 'WordReference', url: `https://www.wordreference.com/iten/${word}` },
      { label: 'Wiktionary', url: `https://it.wiktionary.org/wiki/${word}` },
      { label: 'Treccani', url: `https://www.treccani.it/vocabolario/ricerca/${word}/` },
    ]
  },
  searchText: (card) =>
    [card.extra.article, card.term, card.extra.plural, card.translation]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  seed: starterDeck,
}
