/**
 * The `updatedAt` for a local write. Never lower than the row's previous value plus one, so a
 * device whose clock runs behind can't produce a write the server's last-write-wins guard drops,
 * and every edit of a row has a distinct stamp (sync relies on that to tell "changed since push").
 */
export function stamp(previous: number | undefined, now: Date): number {
  return Math.max(now.getTime(), (previous ?? 0) + 1)
}
