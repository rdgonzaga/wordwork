import { describe, expect, it } from 'vitest'
import { buildQuestions, scoreDrill, shuffle, type DrillSpec } from './drill'

interface TestCard {
  id: string
  term: string
  translation: string
  article?: string
}

const spec: DrillSpec<TestCard> = {
  title: 'der / die / das',
  choices: ['der', 'die', 'das'],
  answer: (c) => c.article,
}

const card = (id: string, article?: string): TestCard => ({
  id,
  term: `Wort${id}`,
  translation: `word ${id}`,
  article,
})

describe('shuffle', () => {
  it('returns every item once without touching the input', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input)
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5])
    expect(input).toEqual([1, 2, 3, 4, 5])
  })

  it('is deterministic for a fixed random source', () => {
    const fixed = () => 0
    expect(shuffle([1, 2, 3, 4], fixed)).toEqual(shuffle([1, 2, 3, 4], fixed))
  })
})

describe('buildQuestions', () => {
  const cards = [card('1', 'der'), card('2', 'die'), card('3', 'das'), card('4'), card('5', 'xyz')]

  it('only asks about cards the spec accepts', () => {
    const qs = buildQuestions(cards, spec, 10)
    expect(qs.map((q) => q.cardId).sort()).toEqual(['1', '2', '3'])
  })

  it('carries the right answer and the choices', () => {
    const [q] = buildQuestions([card('1', 'die')], spec, 10)
    expect(q).toEqual({
      cardId: '1',
      term: 'Wort1',
      translation: 'word 1',
      choices: ['der', 'die', 'das'],
      answer: 'die',
    })
  })

  it('caps the session size', () => {
    expect(buildQuestions(cards, spec, 2)).toHaveLength(2)
    expect(buildQuestions(cards, spec, 0)).toEqual([])
  })

  it('is empty when nothing qualifies', () => {
    expect(buildQuestions([card('4')], spec)).toEqual([])
    expect(buildQuestions([], spec)).toEqual([])
  })
})

describe('scoreDrill', () => {
  const qs = buildQuestions(
    [card('1', 'der'), card('2', 'die'), card('3', 'das')],
    spec,
    3,
    () => 0.99,
  )
  const answers = qs.map((q) => q.answer)

  it('counts a perfect run', () => {
    expect(scoreDrill(qs, answers)).toEqual({ correct: 3, total: 3, missed: [] })
  })

  it('lists the misses in order', () => {
    const given = [...answers]
    given[1] = 'wrong'
    const score = scoreDrill(qs, given)
    expect(score.correct).toBe(2)
    expect(score.missed).toEqual([qs[1]])
  })

  it('counts unanswered questions as missed', () => {
    expect(scoreDrill(qs, answers.slice(0, 1))).toMatchObject({ correct: 1, total: 3 })
  })

  it('scores an empty session as 0 of 0', () => {
    expect(scoreDrill([], [])).toEqual({ correct: 0, total: 0, missed: [] })
  })
})
