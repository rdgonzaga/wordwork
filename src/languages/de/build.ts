import type { SeedCard } from '../index.ts'
import type { Article } from './articles.ts'

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
    return { term, translation, example, exampleTranslation, extra, tags: ['A1', 'noun'], source }
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
      tags: ['A1', tag],
      source,
    })
  }

  return { noun, verb: word('verb'), other: word('word'), phrase: word('phrase') }
}
