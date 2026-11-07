import { toDay, weekStart, type DayKey } from '../domain/day.ts'
import {
  MAX_NOTES_LENGTH,
  MAX_SENTENCE_LENGTH,
  diaryId,
  safeUrl,
  songId,
} from '../domain/journal.ts'
import type { Diary, LangCode, Song, WordworkDb } from './schema.ts'
import { getSettings } from './settings.ts'
import { stamp } from './stamp.ts'

/**
 * Writes the day's sentence. Blank text removes the entry (a tombstone if it ever existed),
 * so clearing the box and deleting are the same thing.
 */
export async function saveSentence(
  db: WordworkDb,
  day: DayKey,
  language: LangCode,
  text: string,
  now: Date,
): Promise<void> {
  const trimmed = text.trim().slice(0, MAX_SENTENCE_LENGTH)
  const id = diaryId(day, language)

  await db.transaction('rw', db.diary, async () => {
    const existing = await db.diary.get(id)
    if (!trimmed) {
      if (existing && !existing.deleted) {
        await db.diary.update(id, {
          deleted: true,
          updatedAt: stamp(existing.updatedAt, now),
          dirty: 1,
        })
      }
      return
    }
    if (existing && !existing.deleted && existing.text === trimmed) return
    const row: Diary = {
      id,
      day,
      language,
      text: trimmed,
      updatedAt: stamp(existing?.updatedAt, now),
      deleted: false,
      dirty: 1,
    }
    await db.diary.put(row)
  })
}

/** Entries for one language, newest day first. */
export async function listSentences(db: WordworkDb, language: LangCode): Promise<Diary[]> {
  const rows = await db.diary.toArray()
  return rows
    .filter((r) => !r.deleted && r.language === language)
    .sort((a, b) => b.day.localeCompare(a.day))
}

export interface SongInput {
  title: string
  artist: string
  url?: string
  notes?: string
}

/**
 * Sets the song for the week containing `day`. One per week and language, so a second save
 * edits it. A blank title removes it.
 */
export async function saveSong(
  db: WordworkDb,
  language: LangCode,
  day: DayKey,
  input: SongInput,
  now: Date,
): Promise<void> {
  const weekOf = weekStart(day)
  const id = songId(weekOf, language)
  const title = input.title.trim()

  await db.transaction('rw', db.songs, async () => {
    const existing = await db.songs.get(id)
    if (!title) {
      if (existing && !existing.deleted) {
        await db.songs.update(id, {
          deleted: true,
          updatedAt: stamp(existing.updatedAt, now),
          dirty: 1,
        })
      }
      return
    }
    const row: Song = {
      id,
      language,
      weekOf,
      title,
      artist: input.artist.trim(),
      url: safeUrl(input.url),
      notes: (input.notes ?? '').trim().slice(0, MAX_NOTES_LENGTH),
      updatedAt: stamp(existing?.updatedAt, now),
      deleted: false,
      dirty: 1,
    }
    await db.songs.put(row)
  })
}

/** Songs for one language, newest week first. */
export async function listSongs(db: WordworkDb, language: LangCode): Promise<Song[]> {
  const rows = await db.songs.toArray()
  return rows
    .filter((r) => !r.deleted && r.language === language)
    .sort((a, b) => b.weekOf.localeCompare(a.weekOf))
}

/** Today's study day, for screens that need it alongside the entries. */
export async function currentDay(db: WordworkDb, now: Date): Promise<DayKey> {
  return toDay(now, await getSettings(db))
}
