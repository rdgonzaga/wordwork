import { useCallback, useState, type FormEvent } from 'react'
import LanguagePicker from '../../app/LanguagePicker.tsx'
import { useActiveLanguage } from '../../app/language.ts'
import { useLive } from '../../app/useLive.ts'
import { currentDay, listSentences, listSongs, saveSentence, saveSong } from '../../db/journal.ts'
import { db } from '../../db/schema.ts'
import { weekStart } from '../../domain/day.ts'
import { MAX_NOTES_LENGTH, MAX_SENTENCE_LENGTH, safeUrl } from '../../domain/journal.ts'
import './Journal.css'

async function load(language: string) {
  return {
    today: await currentDay(db, new Date()),
    sentences: await listSentences(db, language),
    songs: await listSongs(db, language),
  }
}

function SentenceEditor({
  day,
  language,
  initial,
}: {
  day: string
  language: string
  initial: string
}) {
  const [text, setText] = useState(initial)
  const changed = text.trim() !== initial

  function submit(e: FormEvent) {
    e.preventDefault()
    void saveSentence(db, day, language, text, new Date())
  }

  return (
    <form className="journal-form" onSubmit={submit}>
      <textarea
        aria-label="Sentence of the day"
        rows={3}
        maxLength={MAX_SENTENCE_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        lang={language}
        placeholder="One sentence in the language you're learning"
      />
      <button type="submit" disabled={!changed}>
        {initial && !text.trim() ? 'Delete' : 'Save'}
      </button>
    </form>
  )
}

function SongEditor({
  weekOf,
  language,
  initial,
}: {
  weekOf: string
  language: string
  initial: { title: string; artist: string; url: string; notes: string }
}) {
  const [title, setTitle] = useState(initial.title)
  const [artist, setArtist] = useState(initial.artist)
  const [url, setUrl] = useState(initial.url)
  const [notes, setNotes] = useState(initial.notes)

  const changed =
    title.trim() !== initial.title ||
    artist.trim() !== initial.artist ||
    (safeUrl(url) ?? '') !== initial.url ||
    notes.trim() !== initial.notes

  function submit(e: FormEvent) {
    e.preventDefault()
    void saveSong(db, language, weekOf, { title, artist, url, notes }, new Date())
  }

  return (
    <form className="journal-form" onSubmit={submit}>
      <label>
        <span className="muted">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        <span className="muted">Artist</span>
        <input value={artist} onChange={(e) => setArtist(e.target.value)} />
      </label>
      <label>
        <span className="muted">Link</span>
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
        />
      </label>
      <label>
        <span className="muted">Notes</span>
        <textarea
          rows={3}
          maxLength={MAX_NOTES_LENGTH}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button type="submit" disabled={!changed}>
        {initial.title && !title.trim() ? 'Remove' : 'Save'}
      </button>
    </form>
  )
}

export default function Journal() {
  const { active } = useActiveLanguage()
  const query = useCallback(() => (active ? load(active) : Promise.resolve(undefined)), [active])
  const data = useLive(query)
  const [picked, setPicked] = useState<string>()

  if (!active) return <p className="muted">No deck yet.</p>
  if (!data) return <p className="muted">Loading…</p>

  const { today, sentences, songs } = data
  const day = picked ?? today
  const sentence = sentences.find((s) => s.day === day)
  const thisWeek = weekStart(today)
  const song = songs.find((s) => s.weekOf === thisWeek)
  const pastSongs = songs.filter((s) => s.weekOf !== thisWeek)

  return (
    <>
      <h1>Journal</h1>
      <LanguagePicker />

      <h2>Sentence of the day</h2>
      <label className="journal-day">
        <span className="muted">Day</span>
        <input
          type="date"
          value={day}
          max={today}
          onChange={(e) => e.target.value && setPicked(e.target.value)}
        />
      </label>
      <SentenceEditor
        key={`${day}:${sentence?.updatedAt ?? 0}`}
        day={day}
        language={active}
        initial={sentence?.text ?? ''}
      />

      {sentences.length > 0 && (
        <ul className="journal-list" aria-label="Past sentences">
          {sentences.map((s) => (
            <li key={s.id}>
              <button type="button" className="link" onClick={() => setPicked(s.day)}>
                {s.day}
              </button>
              <span lang={active}>{s.text}</span>
            </li>
          ))}
        </ul>
      )}

      <h2>Song of the week</h2>
      <p className="muted">Week of {thisWeek}</p>
      <SongEditor
        key={`${thisWeek}:${song?.updatedAt ?? 0}`}
        weekOf={thisWeek}
        language={active}
        initial={{
          title: song?.title ?? '',
          artist: song?.artist ?? '',
          url: song?.url ?? '',
          notes: song?.notes ?? '',
        }}
      />

      {pastSongs.length > 0 && (
        <>
          <h3>Earlier weeks</h3>
          <ul className="journal-list" aria-label="Past songs">
            {pastSongs.map((s) => (
              <li key={s.id}>
                <span className="muted">{s.weekOf}</span>
                <span>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                  {s.artist && <span className="muted"> · {s.artist}</span>}
                  {s.notes && <span className="journal-notes">{s.notes}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
