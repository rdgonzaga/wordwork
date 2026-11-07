import type { TermCard } from '../index.ts'

export default function Term({ card }: { card: TermCard }) {
  const article = card.extra.article
  const elided = article?.endsWith("'")
  return (
    <span className="term" lang="it">
      {article && (elided ? article : `${article} `)}
      {card.term}
    </span>
  )
}
