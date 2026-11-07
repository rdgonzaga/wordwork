import { useEffect, useRef, useState } from 'react'
import { Link } from 'wouter'
import { useLive } from '../../app/useLive.ts'
import { db } from '../../db/schema.ts'
import {
  DEFAULT_DRILL_SIZE,
  buildQuestions,
  scoreDrill,
  type Question,
} from '../../domain/drill.ts'
import { getLanguage } from '../../languages/index.ts'
import './Drill.css'

async function load() {
  const decks = (await db.decks.toArray()).filter((d) => !d.deleted)
  if (decks.length === 0) return { language: undefined, cards: [] }
  const language = decks[0].language
  const ids = new Set(decks.filter((d) => d.language === language).map((d) => d.id))
  const cards = (await db.cards.toArray()).filter((c) => !c.deleted && ids.has(c.deckId))
  return { language, cards }
}

function Session({
  title,
  questions,
  onExit,
}: {
  title: string
  questions: Question[]
  onExit: () => void
}) {
  const [given, setGiven] = useState<string[]>([])
  const next = useRef<HTMLButtonElement>(null)

  const index = given.length
  const [picked, setPicked] = useState<string>()
  const q = questions[index]

  function choose(choice: string) {
    if (picked === undefined) setPicked(choice)
  }

  function advance() {
    if (picked === undefined) return
    setGiven((g) => [...g, picked])
    setPicked(undefined)
  }

  useEffect(() => {
    if (picked !== undefined) next.current?.focus()
  }, [picked])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q || e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= q.choices.length) choose(q.choices[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!q) {
    const score = scoreDrill(questions, given)
    return (
      <>
        <h2>{title}</h2>
        <p className="drill-score" role="status">
          {score.correct} of {score.total}
        </p>
        {score.missed.length > 0 && (
          <>
            <h3>To review</h3>
            <ul className="drill-missed">
              {score.missed.map((m) => (
                <li key={m.cardId}>
                  <strong>{m.answer}</strong> {m.term}{' '}
                  <span className="muted">· {m.translation}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <button type="button" onClick={onExit}>
          Done
        </button>
      </>
    )
  }

  return (
    <>
      <p className="muted">
        {title} · {index + 1} of {questions.length}
      </p>
      <div className="drill-card">
        <p className="drill-term">{q.term}</p>
        <p className="muted">{q.translation}</p>
        <div className="drill-choices" role="group" aria-label="Answer">
          {q.choices.map((c, i) => {
            const state =
              picked === undefined
                ? undefined
                : c === q.answer
                  ? 'right'
                  : c === picked
                    ? 'wrong'
                    : undefined
            return (
              <button
                key={c}
                type="button"
                data-state={state}
                disabled={picked !== undefined}
                onClick={() => choose(c)}
              >
                <span className="muted">{i + 1}</span> {c}
              </button>
            )
          })}
        </div>
        {picked !== undefined && (
          <p role="status">{picked === q.answer ? 'Right.' : `It’s ${q.answer} ${q.term}.`}</p>
        )}
        <button
          ref={next}
          type="button"
          className="primary"
          disabled={picked === undefined}
          onClick={advance}
        >
          {index + 1 === questions.length ? 'Finish' : 'Next'}
        </button>
      </div>
    </>
  )
}

export default function Drill() {
  const data = useLive(load)
  const [questions, setQuestions] = useState<Question[]>()

  if (!data) return <p className="muted">Loading…</p>

  const spec = data.language ? getLanguage(data.language).drill : undefined
  const available = spec ? buildQuestions(data.cards, spec, Infinity).length : 0

  return (
    <>
      <h1>Drill</h1>
      {!spec || available === 0 ? (
        <p className="muted">
          No words to drill yet. Cards need an article set (add one in{' '}
          <Link href="/cards">Cards</Link>
          ).
        </p>
      ) : questions ? (
        <Session title={spec.title} questions={questions} onExit={() => setQuestions(undefined)} />
      ) : (
        <>
          <p className="muted">
            {spec.title}: pick the right one for {Math.min(DEFAULT_DRILL_SIZE, available)} of your{' '}
            {available} words. Results don&apos;t change your review schedule.
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => setQuestions(buildQuestions(data.cards, spec, DEFAULT_DRILL_SIZE))}
          >
            Start
          </button>
        </>
      )}
    </>
  )
}
