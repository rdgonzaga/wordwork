import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import LookupLinks from '../../app/LookupLinks.tsx'
import { addCard, deleteCard, updateCard, type CardInput } from '../../db/cards.ts'
import { db, type Card, type Deck } from '../../db/schema.ts'
import { getLanguage } from '../../languages/index.ts'
import './Cards.css'

const blank: CardInput = { term: '', translation: '', extra: {}, tags: [] }

export default function Cards() {
  const [deck, setDeck] = useState<Deck | null | undefined>(undefined)
  const [cards, setCards] = useState<Card[]>([])
  const [query, setQuery] = useState('')
  // null = closed, 'new' = adding, otherwise the card being edited
  const [editing, setEditing] = useState<Card | 'new' | null>(null)

  const load = useCallback(async () => {
    const d = (await db.decks.toArray()).find((x) => !x.deleted) ?? null
    setDeck(d)
    if (d) {
      const list = await db.cards.where('deckId').equals(d.id).toArray()
      setCards(list.filter((c) => !c.deleted).sort((a, b) => a.newOrder - b.newOrder))
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await load()
    })()
  }, [load])

  if (deck === undefined) return <p className="muted">Loading…</p>
  if (deck === null) {
    return (
      <>
        <h1>Cards</h1>
        <p className="muted">No deck yet.</p>
      </>
    )
  }

  const lang = getLanguage(deck.language)
  const Term = lang.Term
  const q = query.trim().toLowerCase()
  const shown = q ? cards.filter((c) => lang.searchText(c).includes(q)) : cards

  async function save(input: CardInput, existing: Card | null) {
    if (!deck) return
    if (existing) await updateCard(db, existing.id, input, new Date())
    else await addCard(db, deck.id, input, new Date())
    setEditing(null)
    await load()
  }

  async function remove(card: Card) {
    await deleteCard(db, card.id, new Date())
    setEditing(null)
    await load()
  }

  return (
    <>
      <h1>Cards</h1>
      <p className="muted">
        {deck.name} · {cards.length} cards
        {lang.drill && (
          <>
            {' '}
            · <Link href="/drill">{lang.drill.title} drill</Link>
          </>
        )}
      </p>

      {editing ? (
        <CardForm
          key={editing === 'new' ? 'new' : editing.id}
          fields={lang.extraFields}
          lookupLinks={lang.lookupLinks}
          initial={editing === 'new' ? blank : editing}
          onSave={(input) => save(input, editing === 'new' ? null : editing)}
          onCancel={() => setEditing(null)}
          onDelete={editing === 'new' ? undefined : () => remove(editing)}
        />
      ) : (
        <div className="cards-toolbar">
          <input
            type="search"
            placeholder="Search"
            aria-label="Search cards"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="primary" onClick={() => setEditing('new')}>
            Add card
          </button>
        </div>
      )}

      <ul className="card-list">
        {shown.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setEditing(c)}>
              <Term card={c} />
              <span className="muted">{c.translation}</span>
            </button>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="muted">No cards match.</p>}
    </>
  )
}

function CardForm({
  fields,
  lookupLinks,
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  fields: ReturnType<typeof getLanguage>['extraFields']
  lookupLinks: ReturnType<typeof getLanguage>['lookupLinks']
  initial: CardInput
  onSave: (input: CardInput) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}) {
  const [v, setV] = useState<CardInput>(initial)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!v.term.trim() || !v.translation.trim()) return
    void onSave(v)
  }

  return (
    <form className="card-form" onSubmit={submit}>
      <label>
        Term
        <input value={v.term} onChange={(e) => setV({ ...v, term: e.target.value })} required />
      </label>
      {fields.map((f) => (
        <label key={f.key}>
          {f.label}
          {f.type === 'select' ? (
            <select
              value={v.extra[f.key] ?? ''}
              onChange={(e) => setV({ ...v, extra: { ...v.extra, [f.key]: e.target.value } })}
            >
              <option value="">–</option>
              {f.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              value={v.extra[f.key] ?? ''}
              onChange={(e) => setV({ ...v, extra: { ...v.extra, [f.key]: e.target.value } })}
            />
          )}
        </label>
      ))}
      <label>
        Translation
        <input
          value={v.translation}
          onChange={(e) => setV({ ...v, translation: e.target.value })}
          required
        />
      </label>
      <label>
        Example
        <input value={v.example ?? ''} onChange={(e) => setV({ ...v, example: e.target.value })} />
      </label>
      <label>
        Example translation
        <input
          value={v.exampleTranslation ?? ''}
          onChange={(e) => setV({ ...v, exampleTranslation: e.target.value })}
        />
      </label>
      {v.term.trim() && <LookupLinks links={lookupLinks({ term: v.term })} />}
      <div className="card-form-actions">
        <button type="submit" className="primary">
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button type="button" className="danger" onClick={() => void onDelete()}>
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
