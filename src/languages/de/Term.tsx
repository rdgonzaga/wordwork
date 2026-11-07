import type { TermCard } from '../index.ts'
import { isArticle } from './articles.ts'
import './Term.css'

export default function Term({ card }: { card: TermCard }) {
  const article = card.extra.article
  return (
    <span className="term" lang="de">
      {isArticle(article) && (
        <>
          <span className={`de-article de-article--${article}`}>{article}</span>{' '}
        </>
      )}
      {card.term}
    </span>
  )
}
