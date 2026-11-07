import { toDay } from '../domain/day.ts'
import { MAX_ENTRY_MINUTES, activeMs } from '../domain/minutes.ts'
import type { Minutes, WordworkDb } from './schema.ts'
import { getSettings } from './settings.ts'
import { stamp } from './stamp.ts'

/** Logs a manual entry for today. Returns nothing if the amount isn't a usable number. */
export async function addMinutes(
  db: WordworkDb,
  amount: number,
  now: Date,
): Promise<Minutes | undefined> {
  if (!Number.isFinite(amount)) return undefined
  const minutes = Math.min(MAX_ENTRY_MINUTES, Math.round(amount))
  if (minutes < 1) return undefined

  const row: Minutes = {
    id: crypto.randomUUID(),
    day: toDay(now, await getSettings(db)),
    minutes,
    source: 'manual',
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    deleted: false,
    dirty: 1,
  }
  await db.minutes.add(row)
  return row
}

/** Tombstones an entry so the removal syncs. */
export async function removeMinutes(db: WordworkDb, id: string, now: Date): Promise<void> {
  await db.transaction('rw', db.minutes, async () => {
    const row = await db.minutes.get(id)
    if (row) {
      await db.minutes.update(id, { deleted: true, updatedAt: stamp(row.updatedAt, now), dirty: 1 })
    }
  })
}

/** Every entry that hasn't been removed, newest first. */
export async function listMinutes(db: WordworkDb): Promise<Minutes[]> {
  const rows = await db.minutes.toArray()
  return rows.filter((r) => !r.deleted).sort((a, b) => b.createdAt - a.createdAt)
}

/** Review time for one sitting on one study day. One synced row, updated as cards are rated. */
export interface ReviewClock {
  id: string
  day: string
  ms: number
}

/**
 * Adds the time spent on a card to the sitting's `review` row and returns the new clock.
 * The row holds whole minutes, so it appears once a minute has built up and is only written
 * when that number changes. A sitting that crosses the day rollover starts a fresh row.
 */
export async function addReviewTime(
  db: WordworkDb,
  clock: ReviewClock | undefined,
  durationMs: number,
  now: Date,
): Promise<ReviewClock> {
  const day = toDay(now, await getSettings(db))
  const current = clock && clock.day === day ? clock : { id: crypto.randomUUID(), day, ms: 0 }
  const next = { ...current, ms: current.ms + activeMs(durationMs) }
  const minutes = Math.round(next.ms / 60_000)

  await db.transaction('rw', db.minutes, async () => {
    const row = await db.minutes.get(next.id)
    if (!row) {
      if (minutes < 1) return
      await db.minutes.add({
        id: next.id,
        day,
        minutes,
        source: 'review',
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
        deleted: false,
        dirty: 1,
      })
    } else if (row.minutes !== minutes) {
      await db.minutes.update(next.id, {
        minutes,
        updatedAt: stamp(row.updatedAt, now),
        dirty: 1,
      })
    }
  })
  return next
}
