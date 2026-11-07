import type { TermCard } from '../index.ts'

export default function Term({ card }: { card: TermCard }) {
  const reading = card.extra.reading?.trim()
  return (
    <span className="term" lang="ja">
      {reading && reading !== card.term ? (
        <ruby>
          {card.term}
          <rt>{reading}</rt>
        </ruby>
      ) : (
        card.term
      )}
    </span>
  )
}
