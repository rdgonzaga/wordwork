/** What a language module offers for a multiple-choice drill over its cards. */
export interface DrillSpec<C> {
  title: string
  choices: readonly string[]
  /** The right choice for a card, or undefined if the card doesn't belong in the drill. */
  answer(card: C): string | undefined
}

export interface Question {
  cardId: string
  term: string
  translation: string
  choices: readonly string[]
  answer: string
}

export interface DrillScore {
  correct: number
  total: number
  /** Questions answered wrong, in the order asked. */
  missed: Question[]
}

export const DEFAULT_DRILL_SIZE = 10

/** Fisher-Yates on a copy. `random` returns [0, 1) and is injectable for tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Up to `size` questions from cards the spec accepts, in random order. */
export function buildQuestions<C extends { id: string; term: string; translation: string }>(
  cards: readonly C[],
  spec: DrillSpec<C>,
  size = DEFAULT_DRILL_SIZE,
  random: () => number = Math.random,
): Question[] {
  const eligible = cards.flatMap((card) => {
    const answer = spec.answer(card)
    if (answer === undefined || !spec.choices.includes(answer)) return []
    return [
      {
        cardId: card.id,
        term: card.term,
        translation: card.translation,
        choices: spec.choices,
        answer,
      },
    ]
  })
  return shuffle(eligible, random).slice(0, Math.max(0, size))
}

/** `given[i]` is the choice picked for `questions[i]`; unanswered questions count as missed. */
export function scoreDrill(questions: readonly Question[], given: readonly string[]): DrillScore {
  const missed = questions.filter((q, i) => given[i] !== q.answer)
  return { correct: questions.length - missed.length, total: questions.length, missed }
}
