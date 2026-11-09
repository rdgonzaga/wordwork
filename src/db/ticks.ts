import type { DayKey } from '../domain/day.ts'
import type { Tick, WordworkDb } from './schema.ts'
import { stamp } from './stamp.ts'

/** Same rule as the server's CHECK on ticks.id; a row that breaks it would never sync. */
export const TICK_ID = /^[a-z0-9:.-]{1,80}$/

/** The row id for an item: daily items get one row per day. */
export function tickId(item: string, day?: DayKey): string {
  const id = day ? `${day}:${item}` : item
  if (!TICK_ID.test(id)) throw new Error(`Bad tick id "${id}"`)
  return id
}

/** Ticks or unticks an item. Unticking leaves a tombstone so the change syncs. */
export async function setTick(
  db: WordworkDb,
  item: string,
  checked: boolean,
  now: Date,
  day?: DayKey,
): Promise<void> {
  const id = tickId(item, day)
  await db.transaction('rw', db.ticks, async () => {
    const existing = await db.ticks.get(id)
    const isChecked = existing !== undefined && !existing.deleted
    if (isChecked === checked) return
    if (!checked && !existing) return
    const row: Tick = {
      id,
      updatedAt: stamp(existing?.updatedAt, now),
      deleted: !checked,
      dirty: 1,
    }
    if (day) row.day = day
    await db.ticks.put(row)
  })
}

/** Ids of every ticked item. */
export async function listTicks(db: WordworkDb): Promise<Set<string>> {
  const rows = await db.ticks.toArray()
  return new Set(rows.filter((r) => !r.deleted).map((r) => r.id))
}
