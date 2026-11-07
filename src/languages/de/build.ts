import type { SeedCard } from '../index.ts'
import type { Article } from './articles.ts'

// Everyday words that aren't headwords in the Goethe Start Deutsch 1 Wortliste, so they
// don't get the A1 tag.
const OFF_LIST = new Set([
  'Stuhl',
  'Katze',
  'Onkel',
  'Tante',
  'Nachbar',
  'Fisch',
  'Käse',
  'Suppe',
  'Tasse',
  'Teller',
  'Schlafzimmer',
  'Wohnzimmer',
  'Computer',
  'Supermarkt',
  'Apotheke',
  'Krankenhaus',
  'Park',
  'U-Bahn',
  'Markt',
  'Hose',
  'Hemd',
  'Kleid',
  'Firma',
  'Büro',
  'Ohr',
  'Nase',
  'Herz',
  'Schnee',
  'Musik',
  'Spiel',
  'Tür',
  'Fenster',
  'Schweiz',
  'Österreich',
  'denken',
  'singen',
  'zeigen',
  'treffen',
  'heiß',
  'kalt',
  'warm',
  'nett',
  'manchmal',
  'früh',
  'weil',
])

function level(term: string): string {
  return OFF_LIST.has(term) ? 'extra' : 'A1'
}

/** Card builders for one group of A1 words. `source` becomes the lesson filter in Cards. */
export function group(source?: string) {
  function noun(
    article: Article,
    term: string,
    plural: string | null,
    translation: string,
    example?: string,
    exampleTranslation?: string,
  ): SeedCard {
    const extra: Record<string, string> = { article }
    if (plural) extra.plural = plural
    return {
      term,
      translation,
      example,
      exampleTranslation,
      extra,
      tags: [level(term), 'noun'],
      source,
    }
  }

  function word(tag: 'verb' | 'word' | 'phrase') {
    return (
      term: string,
      translation: string,
      example?: string,
      exampleTranslation?: string,
    ): SeedCard => ({
      term,
      translation,
      example,
      exampleTranslation,
      extra: {},
      tags: [level(term), tag],
      source,
    })
  }

  return { noun, verb: word('verb'), other: word('word'), phrase: word('phrase') }
}
