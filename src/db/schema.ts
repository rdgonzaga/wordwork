import { Dexie, type EntityTable } from 'dexie'
import type { DayKey, DaySettings } from '../domain/day'

/** ISO 639-1 code, e.g. `de`. The language registry (#7) narrows this. */
export type LangCode = string

/** Fields every synced row carries. `dirty` is local only: 1 until pushed. IndexedDB can't index booleans, hence 0/1. */
export interface Synced {
  updatedAt: number
  deleted: boolean
  dirty: 0 | 1
}

export interface Deck extends Synced {
  id: string
  language: LangCode
  name: string
  createdAt: number
}

export interface Card extends Synced {
  id: string
  deckId: string
  term: string
  translation: string
  example?: string
  exampleTranslation?: string
  /** Owned by the language module, e.g. de → { article, plural }. */
  extra: Record<string, string>
  tags: string[]
  /** e.g. "Nicos Weg A1 · 12" */
  source?: string
  newOrder: number
  suspended: boolean
  createdAt: number
}

export type Rating = 1 | 2 | 3 | 4

/** Append-only. Never edited; `deleted` only for tombstoning a deleted card's history. */
export interface Review extends Synced {
  id: string
  cardId: string
  rating: Rating
  reviewedAt: number
  day: DayKey
  durationMs: number
  deviceId: string
}

/** Local cache, rebuilt from reviews. Not synced. */
export interface Schedule {
  cardId: string
  state: 'new' | 'learning' | 'review' | 'relearning'
  step: number
  ease: number
  intervalDays: number
  dueDay?: DayKey
  dueAt?: number
  reps: number
  lapses: number
}

export interface Minutes extends Synced {
  id: string
  day: DayKey
  minutes: number
  source: 'manual' | 'review'
  createdAt: number
}

export interface Diary extends Synced {
  /** `${day}:${language}` so two devices write the same row. */
  id: string
  day: DayKey
  language: LangCode
  text: string
}

export interface Song extends Synced {
  id: string
  language: LangCode
  /** Monday of the week. */
  weekOf: DayKey
  title: string
  artist: string
  url?: string
  notes: string
}

export interface Settings extends DaySettings {
  id: 'me'
  newPerDay: number
  maxReviewsPerDay: number
  goalHours: number
  streakMinutes: number
  updatedAt: number
  dirty: 0 | 1
}

/** Local only. */
export interface SyncMeta {
  id: 'me'
  cursor: number
  deviceId: string
  userId?: string
}

export type WordworkDb = Dexie & {
  decks: EntityTable<Deck, 'id'>
  cards: EntityTable<Card, 'id'>
  reviews: EntityTable<Review, 'id'>
  schedules: EntityTable<Schedule, 'cardId'>
  minutes: EntityTable<Minutes, 'id'>
  diary: EntityTable<Diary, 'id'>
  songs: EntityTable<Song, 'id'>
  settings: EntityTable<Settings, 'id'>
  syncMeta: EntityTable<SyncMeta, 'id'>
}

export function createDb(name = 'wordwork'): WordworkDb {
  const db = new Dexie(name) as WordworkDb
  db.version(1).stores({
    decks: 'id, language, dirty',
    cards: 'id, deckId, [deckId+newOrder], dirty',
    reviews: 'id, cardId, day, reviewedAt, dirty',
    schedules: 'cardId, state, dueDay, dueAt',
    minutes: 'id, day, dirty',
    diary: 'id, day, dirty',
    songs: 'id, language, weekOf, dirty',
    settings: 'id',
    syncMeta: 'id',
  })
  return db
}

export const db = createDb()
