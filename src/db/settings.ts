import type { Settings, WordworkDb } from './schema'
import { stamp } from './stamp.ts'

export type SettingsPatch = Partial<Omit<Settings, 'id' | 'updatedAt' | 'dirty'>>

export const DEFAULT_SETTINGS: Settings = {
  id: 'me',
  newPerDay: 10,
  maxReviewsPerDay: 100,
  goalHours: 400,
  streakMinutes: 10,
  timeZone: 'Asia/Manila',
  rolloverHour: 4,
  updatedAt: 0,
  dirty: 0,
}

/** Saved settings, or the defaults if none are saved yet. Never writes. */
export async function getSettings(db: WordworkDb): Promise<Settings> {
  return (await db.settings.get('me')) ?? DEFAULT_SETTINGS
}

// Whole numbers within the server's column limits (0001_init.sql). Anything else would make
// Postgres reject the row and keep it from ever syncing.
const LIMITS: Partial<Record<keyof SettingsPatch, [min: number, max: number]>> = {
  newPerDay: [0, 100_000],
  maxReviewsPerDay: [0, 100_000],
  goalHours: [1, 100_000],
  streakMinutes: [1, 1_440],
  rolloverHour: [0, 23],
}

function sanitize(patch: SettingsPatch): SettingsPatch {
  const out: Record<string, unknown> = { ...patch }
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    const value = out[key]
    if (value === undefined) continue
    if (typeof value !== 'number' || !Number.isFinite(value)) delete out[key]
    else out[key] = Math.min(max, Math.max(min, Math.round(value)))
  }
  return out as SettingsPatch
}

export async function updateSettings(
  db: WordworkDb,
  patch: SettingsPatch,
  now: Date,
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings(db)
    await db.settings.put({
      ...current,
      ...sanitize(patch),
      id: 'me',
      updatedAt: stamp(current.updatedAt, now),
      dirty: 1,
    })
  })
}
