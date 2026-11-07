/** Distinct, non-empty sources in natural order, so "Lesson 2" sorts before "Lesson 10". */
export function lessonSources(cards: readonly { source?: string }[]): string[] {
  const seen = new Set<string>()
  for (const c of cards) {
    const s = c.source?.trim()
    if (s) seen.add(s)
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

/** Cards from one source; an empty `source` means no filter. */
export function filterBySource<C extends { source?: string }>(
  cards: readonly C[],
  source: string,
): C[] {
  return source ? cards.filter((c) => c.source?.trim() === source) : [...cards]
}
