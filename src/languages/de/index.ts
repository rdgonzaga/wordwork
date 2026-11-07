import type { LanguageModule } from '../index.ts'
import { ARTICLES } from './articles.ts'
import { starterDeck } from './seed.ts'
import Term from './Term.tsx'

export const german: LanguageModule = {
  code: 'de',
  name: 'German',
  extraFields: [
    { key: 'article', label: 'Article', type: 'select', options: ARTICLES },
    { key: 'plural', label: 'Plural', type: 'text' },
  ],
  Term,
  speechLang: 'de-DE',
  lookupLinks: (card) => {
    const word = encodeURIComponent(card.term.trim())
    return [
      { label: 'DWDS', url: `https://www.dwds.de/wb/${word}` },
      { label: 'Wiktionary', url: `https://de.wiktionary.org/wiki/${word}` },
      { label: 'Leo', url: `https://dict.leo.org/german-english/${word}` },
    ]
  },
  searchText: (card) =>
    [card.extra.article, card.term, card.extra.plural, card.translation]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  seed: starterDeck,
}
