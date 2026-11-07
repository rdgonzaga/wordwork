import type { Settings, WordworkDb } from './schema'

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

export async function updateSettings(
  db: WordworkDb,
  patch: SettingsPatch,
  now: Date,
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings(db)
    await db.settings.put({ ...current, ...patch, id: 'me', updatedAt: now.getTime(), dirty: 1 })
  })
}
