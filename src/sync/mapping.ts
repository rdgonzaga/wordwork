import type { Card, Deck, Diary, Minutes, Review, Settings, Song, SyncTable } from '../db/schema.ts'

/** A Postgres row as PostgREST sends and receives it (snake_case, nulls for absent). */
export type Row = Record<string, unknown>

interface Local {
  id: string
  updatedAt: number
  deleted?: boolean
}

interface Mapping<T extends Local> {
  toRow: (local: T) => Row
  fromRow: (row: Row) => T
}

const str = (v: unknown) => v as string
const num = (v: unknown) => Number(v)
const opt = (v: unknown) => (v == null ? undefined : (v as string))

// `user_id` and `server_seq` are never sent: the server defaults and stamps them.
// Optional columns go out as null (not undefined) so clearing a field reaches the server.

const decks: Mapping<Deck> = {
  toRow: (d) => ({
    id: d.id,
    language: d.language,
    name: d.name,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
    deleted: d.deleted,
  }),
  fromRow: (r) => ({
    id: str(r.id),
    language: str(r.language),
    name: str(r.name),
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
    deleted: Boolean(r.deleted),
    dirty: 0,
  }),
}

const cards: Mapping<Card> = {
  toRow: (c) => ({
    id: c.id,
    deck_id: c.deckId,
    term: c.term,
    translation: c.translation,
    example: c.example ?? null,
    example_translation: c.exampleTranslation ?? null,
    extra: c.extra,
    tags: c.tags,
    source: c.source ?? null,
    new_order: c.newOrder,
    suspended: c.suspended,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted: c.deleted,
  }),
  fromRow: (r) => ({
    id: str(r.id),
    deckId: str(r.deck_id),
    term: str(r.term),
    translation: str(r.translation),
    example: opt(r.example),
    exampleTranslation: opt(r.example_translation),
    extra: (r.extra as Record<string, string> | null) ?? {},
    tags: (r.tags as string[] | null) ?? [],
    source: opt(r.source),
    newOrder: num(r.new_order),
    suspended: Boolean(r.suspended),
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
    deleted: Boolean(r.deleted),
    dirty: 0,
  }),
}

const reviews: Mapping<Review> = {
  toRow: (v) => ({
    id: v.id,
    card_id: v.cardId,
    rating: v.rating,
    reviewed_at: v.reviewedAt,
    day: v.day,
    duration_ms: v.durationMs,
    device_id: v.deviceId,
    updated_at: v.updatedAt,
    deleted: v.deleted,
  }),
  fromRow: (r) => ({
    id: str(r.id),
    cardId: str(r.card_id),
    rating: num(r.rating) as Review['rating'],
    reviewedAt: num(r.reviewed_at),
    day: str(r.day),
    durationMs: num(r.duration_ms),
    deviceId: str(r.device_id),
    updatedAt: num(r.updated_at),
    deleted: Boolean(r.deleted),
    dirty: 0,
  }),
}

const minutes: Mapping<Minutes> = {
  toRow: (m) => ({
    id: m.id,
    day: m.day,
    minutes: m.minutes,
    source: m.source,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    deleted: m.deleted,
  }),
  fromRow: (r) => ({
    id: str(r.id),
    day: str(r.day),
    minutes: num(r.minutes),
    source: str(r.source) as Minutes['source'],
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
    deleted: Boolean(r.deleted),
    dirty: 0,
  }),
}

const diary: Mapping<Diary> = {
  toRow: (d) => ({
    id: d.id,
    day: d.day,
    language: d.language,
    text: d.text,
    updated_at: d.updatedAt,
    deleted: d.deleted,
  }),
  fromRow: (r) => ({
    id: str(r.id),
    day: str(r.day),
    language: str(r.language),
    text: str(r.text),
    updatedAt: num(r.updated_at),
    deleted: Boolean(r.deleted),
    dirty: 0,
  }),
}

const songs: Mapping<Song> = {
  toRow: (s) => ({
    id: s.id,
    language: s.language,
    week_of: s.weekOf,
    title: s.title,
    artist: s.artist,
    url: s.url ?? null,
    notes: s.notes,
    updated_at: s.updatedAt,
    deleted: s.deleted,
  }),
  fromRow: (r) => ({
    id: str(r.id),
    language: str(r.language),
    weekOf: str(r.week_of),
    title: str(r.title),
    artist: str(r.artist),
    url: opt(r.url),
    notes: str(r.notes),
    updatedAt: num(r.updated_at),
    deleted: Boolean(r.deleted),
    dirty: 0,
  }),
}

// Settings has no local `deleted`; the column exists server-side but is always false.
const settings: Mapping<Settings> = {
  toRow: (s) => ({
    id: s.id,
    time_zone: s.timeZone,
    rollover_hour: s.rolloverHour,
    new_per_day: s.newPerDay,
    max_reviews_per_day: s.maxReviewsPerDay,
    goal_hours: s.goalHours,
    streak_minutes: s.streakMinutes,
    updated_at: s.updatedAt,
    deleted: false,
  }),
  fromRow: (r) => ({
    id: 'me',
    timeZone: str(r.time_zone),
    rolloverHour: num(r.rollover_hour),
    newPerDay: num(r.new_per_day),
    maxReviewsPerDay: num(r.max_reviews_per_day),
    goalHours: num(r.goal_hours),
    streakMinutes: num(r.streak_minutes),
    updatedAt: num(r.updated_at),
    dirty: 0,
  }),
}

// The engine treats every table alike (id, updatedAt, dirty); the per-table types stay above.
export const mappings = { decks, cards, reviews, minutes, diary, songs, settings } as unknown as {
  [K in SyncTable]: Mapping<Local & { dirty: 0 | 1 }>
}
