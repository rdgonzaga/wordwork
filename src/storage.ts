/** Ask the browser not to evict our IndexedDB. Best-effort; failures are ignored. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!('storage' in navigator) || !navigator.storage.persist) return false
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist())
  } catch {
    return false
  }
}
