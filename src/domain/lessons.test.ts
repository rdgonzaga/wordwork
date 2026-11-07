import { describe, expect, it } from 'vitest'
import { filterBySource, lessonSources } from './lessons'

const cards = [
  { id: 1, source: 'Nicos Weg A1 · 10' },
  { id: 2, source: 'Nicos Weg A1 · 2' },
  { id: 3, source: 'Nicos Weg A1 · 2' },
  { id: 4, source: '  ' },
  { id: 5 },
  { id: 6, source: 'Starter A1' },
]

describe('lessonSources', () => {
  it('lists each source once, in natural order', () => {
    expect(lessonSources(cards)).toEqual(['Nicos Weg A1 · 2', 'Nicos Weg A1 · 10', 'Starter A1'])
  })

  it('is empty when nothing is tagged', () => {
    expect(lessonSources([{}, { source: '' }])).toEqual([])
    expect(lessonSources([])).toEqual([])
  })
})

describe('filterBySource', () => {
  it('keeps only cards from that source', () => {
    expect(filterBySource(cards, 'Nicos Weg A1 · 2').map((c) => c.id)).toEqual([2, 3])
  })

  it('returns everything for an empty filter', () => {
    expect(filterBySource(cards, '')).toHaveLength(6)
  })

  it('returns nothing for a source no card has', () => {
    expect(filterBySource(cards, 'Nicos Weg A1 · 99')).toEqual([])
  })
})
