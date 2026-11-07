import { useState, type FormEvent } from 'react'
import { useLive } from '../../app/useLive.ts'
import { addMinutes, listMinutes, removeMinutes } from '../../db/minutes.ts'
import { db } from '../../db/schema.ts'
import { getSettings } from '../../db/settings.ts'
import { toDay } from '../../domain/day.ts'
import { heatmap } from '../../domain/heatmap.ts'
import { dayTotals, formatHours, progress, totalMinutes } from '../../domain/minutes.ts'
import { streakState } from '../../domain/streak.ts'
import './Log.css'

const QUICK = [10, 20, 40]

async function load() {
  return { rows: await listMinutes(db), settings: await getSettings(db) }
}

export default function Log() {
  const data = useLive(load)
  const [custom, setCustom] = useState('')

  if (!data) return <p className="muted">Loading…</p>

  const { rows, settings } = data
  const total = totalMinutes(rows)
  const { percent } = progress(total, settings.goalHours)
  const today = toDay(new Date(), settings)
  const todays = rows.filter((r) => r.day === today)
  const totals = dayTotals(rows)
  const { streak, atRisk } = streakState(totals, today, settings.streakMinutes)
  const weeks = heatmap(totals, today, settings.streakMinutes)

  function submit(e: FormEvent) {
    e.preventDefault()
    const amount = Number(custom)
    if (!Number.isFinite(amount) || amount < 1) return
    void addMinutes(db, amount, new Date())
    setCustom('')
  }

  return (
    <>
      <h1>Log</h1>

      <section className="log-total" aria-label="Progress">
        <p className="log-hours">
          {formatHours(total)} <span className="muted">of {settings.goalHours} h</span>
        </p>
        <div
          className="log-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Progress toward the goal"
        >
          <div style={{ width: `${percent}%` }} />
        </div>
        <p className="muted">
          {percent}% · {formatHours(totalMinutes(todays))} h today
        </p>
      </section>

      <section className="log-streak" aria-label="Streak">
        <p className="log-streak-count">
          {streak} <span className="muted">day streak</span>
        </p>
        {atRisk && (
          <p className="log-warning" role="status">
            Log {settings.streakMinutes} minutes today to keep your {streak}-day streak.
          </p>
        )}
        <div className="heatmap" role="img" aria-label="Study time, last 16 weeks">
          {weeks.flat().map((c) => (
            <span
              key={c.day}
              className="heat"
              data-level={c.level}
              data-today={c.today || undefined}
              data-future={c.future || undefined}
              title={c.future ? undefined : `${c.day}: ${c.minutes} min`}
            />
          ))}
        </div>
      </section>

      <h2>Add time</h2>
      <div className="log-quick">
        {QUICK.map((m) => (
          <button key={m} type="button" onClick={() => void addMinutes(db, m, new Date())}>
            +{m}
          </button>
        ))}
      </div>
      <form className="log-custom" onSubmit={submit}>
        <label>
          <span className="muted">Custom minutes</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
        <button type="submit" disabled={!(Number(custom) >= 1)}>
          Add
        </button>
      </form>

      <h2>Today</h2>
      {todays.length === 0 ? (
        <p className="muted">Nothing logged yet.</p>
      ) : (
        <ul className="log-list">
          {todays.map((r) => (
            <li key={r.id}>
              <span>
                {r.minutes} min <span className="muted">· {r.source}</span>
              </span>
              <button
                type="button"
                className="link"
                onClick={() => void removeMinutes(db, r.id, new Date())}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
