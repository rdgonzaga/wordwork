import type { LanguageModule } from '../index.ts'
import { starterDeck } from './seed.ts'
import Term from './Term.tsx'

export const japanese: LanguageModule = {
  code: 'ja',
  name: 'Japanese',
  extraFields: [{ key: 'reading', label: 'Reading (kana)', type: 'text' }],
  Term,
  speechLang: 'ja-JP',
  lookupLinks: (card) => {
    const word = encodeURIComponent(card.term.trim())
    return [
      { label: 'Jisho', url: `https://jisho.org/search/${word}` },
      { label: 'Wiktionary', url: `https://en.wiktionary.org/wiki/${word}` },
    ]
  },
  searchText: (card) =>
    [card.term, card.extra.reading, card.translation].filter(Boolean).join(' ').toLowerCase(),
  seed: starterDeck,
}
