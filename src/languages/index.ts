import type { ComponentType } from 'react'
import type { Card, LangCode } from '../db/schema.ts'
import { german } from './de/index.ts'

export interface ExtraField {
  key: string
  label: string
  type: 'text' | 'select'
  options?: readonly string[]
}

export type TermCard = Pick<Card, 'term' | 'extra'>
export type SearchCard = Pick<Card, 'term' | 'translation' | 'extra'>

export type SeedCard = Pick<
  Card,
  'term' | 'translation' | 'example' | 'exampleTranslation' | 'extra' | 'tags'
>

export interface SeedDeck {
  /** Stable key; seeded ids derive from it, so devices seed identical rows. */
  key: string
  name: string
  source: string
  cards: readonly SeedCard[]
}

/** Everything language-specific. UI code asks the registry, never a language directly. */
export interface LanguageModule {
  code: LangCode
  name: string
  /** Form fields stored in `card.extra`. */
  extraFields: readonly ExtraField[]
  /** How a card's term is shown on the review screen and in lists. */
  Term: ComponentType<{ card: TermCard }>
  /** Lowercased text a card search matches against. */
  searchText(card: SearchCard): string
  seed?: SeedDeck
}

export const languages: readonly LanguageModule[] = [german]

export function getLanguage(code: LangCode): LanguageModule {
  const lang = languages.find((l) => l.code === code)
  if (!lang) throw new Error(`Unknown language: ${code}`)
  return lang
}
