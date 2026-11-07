import type { SyncMeta, WordworkDb } from './schema.ts'

/** The local sync record, created on first use. Safe to call concurrently. */
export async function getSyncMeta(db: WordworkDb): Promise<SyncMeta> {
  const existing = await db.syncMeta.get('me')
  if (existing) return { ...existing, cursors: existing.cursors ?? {} }
  const fresh: SyncMeta = { id: 'me', cursors: {}, deviceId: crypto.randomUUID() }
  await db.syncMeta.add(fresh).catch(() => undefined)
  const saved = await db.syncMeta.get('me')
  return { ...(saved ?? fresh), cursors: saved?.cursors ?? {} }
}
