import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'wouter'
import LanguagePicker from '../../app/LanguagePicker.tsx'
import { useActiveLanguage } from '../../app/language.ts'
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

async function load(language: string | undefined) {
  if (!language) return { language, cards: [] }
  const decks = (await db.decks.toArray()).filter((d) => !d.deleted && d.language === language)
  const ids = new Set(decks.map((d) => d.id))
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
  const { active } = useActiveLanguage()
  const query = useCallback(() => load(active), [active])
  const data = useLive(query)
  const [built, setBuilt] = useState<{ language: string | undefined; questions: Question[] }>()

  if (!data) return <p className="muted">Loading…</p>

  // A session built for another language doesn't carry over.
  const questions = built?.language === data.language ? built?.questions : undefined
  const spec = data.language ? getLanguage(data.language).drill : undefined
  const available = spec ? buildQuestions(data.cards, spec, Infinity).length : 0

  return (
    <>
      <h1>Drill</h1>
      <LanguagePicker />
      {!spec ? (
        <p className="muted">No drill for this language yet.</p>
      ) : available === 0 ? (
        <p className="muted">
          No words to drill yet. Cards need an article set (add one in{' '}
          <Link href="/cards">Cards</Link>
          ).
        </p>
      ) : questions ? (
        <Session title={spec.title} questions={questions} onExit={() => setBuilt(undefined)} />
      ) : (
        <>
          <p className="muted">
            {spec.title}: pick the right one for {Math.min(DEFAULT_DRILL_SIZE, available)} of your{' '}
            {available} words. Results don&apos;t change your review schedule.
          </p>
          <button
            type="button"
            className="primary"
            onClick={() =>
              setBuilt({
                language: data.language,
                questions: buildQuestions(data.cards, spec, DEFAULT_DRILL_SIZE),
              })
            }
          >
            Start
          </button>
        </>
      )}
    </>
  )
}
