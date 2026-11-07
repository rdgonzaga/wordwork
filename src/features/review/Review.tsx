import { useCallback, useEffect, useRef, useState } from 'react'
import { db, type Deck, type Rating } from '../../db/schema.ts'
import { loadStudyState, rateCard, undoReview, type StudyState } from '../../db/srs.ts'
import { previewAll } from '../../domain/srs/preview.ts'
import { newSchedule } from '../../domain/srs/scheduler.ts'
import { getLanguage } from '../../languages/index.ts'
import './Review.css'

const RATINGS: { rating: Rating; label: string }[] = [
  { rating: 1, label: 'Again' },
  { rating: 2, label: 'Hard' },
  { rating: 3, label: 'Good' },
  { rating: 4, label: 'Easy' },
]

interface Done {
  reviewId: string
  cardId: string
}

async function firstDeck(): Promise<Deck | undefined> {
  return (await db.decks.toArray()).find((d) => !d.deleted)
}

export default function Review() {
  const [deck, setDeck] = useState<Deck | null | undefined>(undefined)
  const [state, setState] = useState<StudyState | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState<Done[]>([])
  const shownAt = useRef(0)

  const load = useCallback(async (d: Deck, first?: string) => {
    const next = await loadStudyState(db, d.id, new Date())
    if (first) {
      const i = next.queue.findIndex((q) => q.cardId === first)
      if (i > 0) next.queue.unshift(...next.queue.splice(i, 1))
    }
    shownAt.current = performance.now()
    setRevealed(false)
    setState(next)
  }, [])

  useEffect(() => {
    let live = true
    void (async () => {
      // Seeding runs at startup; wait briefly for it on a first launch.
      let d = await firstDeck()
      for (let i = 0; !d && i < 20; i++) {
        await new Promise((r) => setTimeout(r, 100))
        d = await firstDeck()
      }
      if (!live) return
      setDeck(d ?? null)
      if (d) await load(d)
    })()
    return () => {
      live = false
    }
  }, [load])

  // When only learning cards are waiting, check again for ones that have come due.
  const empty = state !== null && state.queue.length === 0
  useEffect(() => {
    if (!empty || !deck) return
    const t = setInterval(() => void load(deck), 15_000)
    return () => clearInterval(t)
  }, [empty, deck, load])

  const head = state?.queue[0]
  const card = head ? state?.cards.get(head.cardId) : undefined

  const rate = useCallback(
    async (rating: Rating) => {
      if (!deck || !card) return
      const ms = Math.round(performance.now() - shownAt.current)
      const { review } = await rateCard(db, card.id, rating, new Date(), ms)
      setDone((d) => [...d, { reviewId: review.id, cardId: card.id }])
      await load(deck)
    },
    [deck, card, load],
  )

  const undo = useCallback(async () => {
    const last = done[done.length - 1]
    if (!deck || !last) return
    await undoReview(db, last.reviewId, new Date())
    setDone((d) => d.slice(0, -1))
    await load(deck, last.cardId)
  }, [deck, done, load])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      if (e.key === ' ' && card && !revealed) {
        e.preventDefault()
        setRevealed(true)
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        void rate(Number(e.key) as Rating)
      } else if (e.key === 'z') {
        void undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, revealed, rate, undo])

  if (deck === undefined || (deck && !state)) return <p className="muted">Loading…</p>
  if (deck === null) {
    return (
      <>
        <h1>Today</h1>
        <p className="muted">No deck yet. Add one from Cards.</p>
      </>
    )
  }

  const lang = getLanguage(deck.language)
  const Term = lang.Term
  const remaining = state?.queue.length ?? 0

  return (
    <>
      <h1>Today</h1>
      <p className="muted review-meta">
        {deck.name} · {remaining} left
        <button
          type="button"
          className="link"
          disabled={done.length === 0}
          onClick={() => void undo()}
        >
          Undo
        </button>
      </p>

      {!card || !state ? (
        <p>Done for now. Nothing else is due.</p>
      ) : (
        <section className="review-card" aria-live="polite">
          <Term card={card} />
          {!revealed ? (
            <button type="button" className="primary" onClick={() => setRevealed(true)}>
              Show answer
            </button>
          ) : (
            <>
              <p className="review-answer">{card.translation}</p>
              {card.example && (
                <p className="muted">
                  {card.example}
                  {card.exampleTranslation && (
                    <>
                      <br />
                      {card.exampleTranslation}
                    </>
                  )}
                </p>
              )}
              <Ratings
                labels={previewAll(
                  state.schedules.get(card.id) ?? newSchedule(card.id),
                  new Date(),
                  state.settings,
                )}
                onRate={(r) => void rate(r)}
              />
            </>
          )}
        </section>
      )}
    </>
  )
}

function Ratings({
  labels,
  onRate,
}: {
  labels: Record<Rating, string>
  onRate: (r: Rating) => void
}) {
  return (
    <div className="ratings">
      {RATINGS.map(({ rating, label }) => (
        <button key={rating} type="button" onClick={() => onRate(rating)}>
          <span>{label}</span>
          <small>{labels[rating]}</small>
        </button>
      ))}
    </div>
  )
}
