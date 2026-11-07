import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/** Re-renders with fresh results whenever a table the query read changes. `query` must be stable. */
export function useLive<T>(query: () => Promise<T>): T | undefined {
  const [value, setValue] = useState<T>()
  useEffect(() => {
    const sub = liveQuery(query).subscribe({ next: setValue, error: () => undefined })
    return () => sub.unsubscribe()
  }, [query])
  return value
}
