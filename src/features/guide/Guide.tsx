import { marked } from 'marked'
import { Fragment, type ReactNode } from 'react'
import { useLive } from '../../app/useLive.ts'
import { listSongs } from '../../db/journal.ts'
import { listMinutes } from '../../db/minutes.ts'
import { db } from '../../db/schema.ts'
import { getSettings } from '../../db/settings.ts'
import { loadStudyState } from '../../db/srs.ts'
import { listTicks, setTick, tickId } from '../../db/ticks.ts'
import { toDay, weekStart, type DayKey } from '../../domain/day.ts'
import { autoTicks, currentWeek, dayKind } from '../../domain/guide.ts'
import { totalMinutes } from '../../domain/minutes.ts'
import {
  PLAN_WEEKS,
  START_DAY,
  blocks,
  daily,
  milestones,
  setup,
  stack,
  type Item,
} from '../../languages/de/guide.ts'
import reference from '../../languages/de/guide.md?raw'
import './Guide.css'

const DAILY_GOAL_MINUTES = 60

// Our own text, so no sanitising. External links open in a new tab.
const referenceSections = reference
  .split(/^## /m)
  .filter(Boolean)
  .map((chunk) => {
    const [title, ...rest] = chunk.split('\n')
    const html = (marked.parse(rest.join('\n'), { async: false }) as string).replaceAll(
      '<a href=',
      '<a target="_blank" rel="noreferrer" href=',
    )
    return { title: title.replace(/\s*\(.*\)$/, ''), html }
  })

async function load() {
  const now = new Date()
  const settings = await getSettings(db)
  const today = toDay(now, settings)

  let queueLeft = 0
  let reviewedToday = 0
  let reviewedCards = 0
  const deck = (await db.decks.toArray()).find((d) => !d.deleted && d.language === 'de')
  if (deck) {
    const state = await loadStudyState(db, deck.id, now)
    queueLeft = state.queue.length
    reviewedCards = state.schedules.size
    const todays = await db.reviews.where('day').equals(today).toArray()
    reviewedToday = todays.filter((r) => !r.deleted && state.cards.has(r.cardId)).length
  }

  const diary = await db.diary.get(`${today}:de`)
  const songs = await listSongs(db, 'de')
  const minutes = (await listMinutes(db)).filter((m) => m.day === today)

  return {
    today,
    ticks: await listTicks(db),
    minutesToday: totalMinutes(minutes),
    auto: autoTicks({
      queueLeft,
      reviewedToday,
      reviewedCards,
      diaryToday: Boolean(diary && !diary.deleted),
      songThisWeek: songs.some((s) => s.weekOf === weekStart(today)),
    }),
  }
}

/** Renders `code` spans in a label. */
function text(s: string): ReactNode {
  return s
    .split('`')
    .map((part, i) => (i % 2 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>))
}

interface CheckProps {
  item: Item
  day?: DayKey
  ticks: Set<string>
  auto: Set<string>
}

function Check({ item, day, ticks, auto }: CheckProps) {
  const checked = item.auto ? auto.has(item.id) : ticks.has(tickId(item.id, day))
  return (
    <li>
      <label className="guide-item" data-done={checked || undefined}>
        <input
          type="checkbox"
          checked={checked}
          disabled={item.auto}
          onChange={(e) => void setTick(db, item.id, e.target.checked, new Date(), day)}
        />
        <span>
          {text(item.label)}
          {item.auto && <span className="guide-auto"> · auto</span>}
          {item.detail && <span className="guide-detail">{text(item.detail)}</span>}
        </span>
      </label>
    </li>
  )
}

function done(items: Item[], ticks: Set<string>, auto: Set<string>, day?: DayKey): number {
  return items.filter((i) => (i.auto ? auto.has(i.id) : ticks.has(tickId(i.id, day)))).length
}

export default function Guide() {
  const data = useLive(load)
  if (!data) return <p className="muted">Loading…</p>

  const { today, ticks, auto, minutesToday } = data
  const kind = dayKind(today)
  const todayItems = daily[kind]
  const week = currentWeek(START_DAY, today)
  const current = week <= PLAN_WEEKS ? Math.ceil(week / 2) - 1 : -1
  const setupDone = done(setup, ticks, auto) === setup.length

  return (
    <div className="guide">
      <h1>Guide</h1>
      <p className="muted">
        German, A1 restart · week {Math.min(week, PLAN_WEEKS)} of {PLAN_WEEKS}
        {week > PLAN_WEEKS && ' (plan done)'}
      </p>

      <section aria-labelledby="g-today">
        <h2 id="g-today">
          Today{' '}
          <span className="muted">
            {done(todayItems, ticks, auto, today)}/{todayItems.length}
          </span>
        </h2>
        <ul className="guide-list">
          {todayItems.map((i) => (
            <Check key={i.id} item={i} day={i.auto ? undefined : today} ticks={ticks} auto={auto} />
          ))}
        </ul>
        <p className="muted guide-minutes">
          {minutesToday} of {DAILY_GOAL_MINUTES} min logged today
          {kind !== 'sunday' && ' · minimum day is 10 min of reviews'}
        </p>
      </section>

      {!setupDone && <SetupSection ticks={ticks} auto={auto} open />}

      <section aria-labelledby="g-plan">
        <h2 id="g-plan">8-week plan</h2>
        {week > PLAN_WEEKS && (
          <p className="muted">
            Plan done. Next: Nicos Weg A2 and the A2 section in Reference. Retake the placement
            test.
          </p>
        )}
        {blocks.map((b, i) => {
          const count = done(b.items, ticks, auto)
          const body = (
            <>
              <p className="muted guide-detail">Deck lessons: {b.lessons}</p>
              <ul className="guide-list">
                {b.items.map((item) => (
                  <Check key={item.id} item={item} ticks={ticks} auto={auto} />
                ))}
              </ul>
            </>
          )
          const title = `Weeks ${b.weeks[0]}-${b.weeks[1]}`
          return i === current ? (
            <div key={title} className="guide-current">
              <h3>
                {title} <span className="muted">· now</span>
              </h3>
              {body}
            </div>
          ) : (
            <details key={title} className="guide-block">
              <summary>
                {title}{' '}
                <span className="muted">
                  {count}/{b.items.length}
                </span>
              </summary>
              {body}
            </details>
          )
        })}
      </section>

      <section aria-labelledby="g-milestones">
        <h2 id="g-milestones">Milestones</h2>
        {milestones.map((m) => (
          <div key={m.title} className="guide-milestone">
            <h3>
              {m.title}{' '}
              <span className="muted">
                {done(m.items, ticks, auto)}/{m.items.length}
              </span>
            </h3>
            <ul className="guide-list">
              {m.items.map((item) => (
                <Check key={item.id} item={item} ticks={ticks} auto={auto} />
              ))}
            </ul>
            <p className="muted guide-detail">Check: {m.check}</p>
          </div>
        ))}
      </section>

      {setupDone && <SetupSection ticks={ticks} auto={auto} />}

      <section aria-labelledby="g-stack">
        <h2 id="g-stack">The stack</h2>
        <dl className="guide-stack">
          {stack.map(([k, v]) => (
            <Fragment key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </Fragment>
          ))}
        </dl>
        <p className="muted guide-detail">One of each, nothing else for the first 8 weeks.</p>
      </section>

      <section aria-labelledby="g-ref">
        <h2 id="g-ref">Reference</h2>
        {referenceSections.map((s) => (
          <details key={s.title} className="guide-block">
            <summary>{s.title}</summary>
            <div className="guide-md" dangerouslySetInnerHTML={{ __html: s.html }} />
          </details>
        ))}
      </section>
    </div>
  )
}

function SetupSection({
  ticks,
  auto,
  open,
}: {
  ticks: Set<string>
  auto: Set<string>
  open?: boolean
}) {
  return (
    <section aria-labelledby="g-setup">
      <details className="guide-block" open={open}>
        <summary>
          <h2 id="g-setup">
            Getting started{' '}
            <span className="muted">
              {done(setup, ticks, auto)}/{setup.length}
            </span>
          </h2>
        </summary>
        <ul className="guide-list">
          {setup.map((item) => (
            <Check key={item.id} item={item} ticks={ticks} auto={auto} />
          ))}
        </ul>
      </details>
    </section>
  )
}
