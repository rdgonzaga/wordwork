import type { Card, Review, Schedule, Settings } from '../../db/schema'
import { toDay, type DaySettings } from '../day'
import { byReviewTime, newSchedule, schedule } from './scheduler'

export type QueueSettings = DaySettings & Pick<Settings, 'newPerDay' | 'maxReviewsPerDay'>

export interface QueueItem {
  cardId: string
  kind: 'learning' | 'review' | 'new'
}

/** What today's review log has already used up of the daily limits. */
export interface TodayCounts {
  /** Cards whose first review is today. */
  newCount: number
  /** Ratings given to review-state cards today. Learning and relearning steps don't count. */
  reviewCount: number
}

/**
 * Counts from the log rather than a counter, so limits hold across reloads and devices. Replays
 * each card to know its state before every rating; pass every review of the cards involved.
 */
export function countToday(reviews: Review[], now: Date, settings: DaySettings): TodayCounts {
  const today = toDay(now, settings)
  const byCard = new Map<string, Review[]>()
  for (const r of reviews) {
    if (r.deleted) continue
    const list = byCard.get(r.cardId)
    if (list) list.push(r)
    else byCard.set(r.cardId, [r])
  }

  const counts: TodayCounts = { newCount: 0, reviewCount: 0 }
  for (const [cardId, list] of byCard) {
    list.sort(byReviewTime)
    let s = newSchedule(cardId)
    for (const r of list) {
      if (r.day === today) {
        if (s.state === 'new') counts.newCount++
        else if (s.state === 'review') counts.reviewCount++
      }
      s = schedule(s, r.rating, new Date(r.reviewedAt), settings)
    }
  }
  return counts
}

export interface QueueInput {
  cards: Card[]
  /** Cards missing from the map are new. */
  schedules: Map<string, Schedule>
  counts: TodayCounts
  now: Date
  settings: QueueSettings
}

/**
 * Today's study order: due learning cards (never capped), then reviews most overdue first, with
 * new cards spread evenly among them. Reviews and new cards are capped by what's left of today's
 * limits.
 */
export function buildQueue({ cards, schedules, counts, now, settings }: QueueInput): QueueItem[] {
  const today = toDay(now, settings)
  const learning: Schedule[] = []
  const reviews: Schedule[] = []
  const fresh: Card[] = []

  for (const card of cards) {
    if (card.deleted || card.suspended) continue
    const s = schedules.get(card.id)
    if (!s || s.state === 'new') fresh.push(card)
    else if (s.state === 'review') {
      if (s.dueDay !== undefined && s.dueDay <= today) reviews.push(s)
    } else if (s.dueAt !== undefined && s.dueAt <= now.getTime()) learning.push(s)
  }

  learning.sort((a, b) => a.dueAt! - b.dueAt! || cmp(a.cardId, b.cardId))
  reviews.sort((a, b) => cmp(a.dueDay!, b.dueDay!) || cmp(a.cardId, b.cardId))
  fresh.sort((a, b) => a.newOrder - b.newOrder || cmp(a.id, b.id))

  const dueReviews = reviews.slice(0, Math.max(0, settings.maxReviewsPerDay - counts.reviewCount))
  const newCards = fresh.slice(0, Math.max(0, settings.newPerDay - counts.newCount))

  const out: QueueItem[] = learning.map((s) => ({ cardId: s.cardId, kind: 'learning' }))
  const gap = newCards.length ? Math.max(1, Math.floor(dueReviews.length / newCards.length)) : 0
  let n = 0
  dueReviews.forEach((s, i) => {
    out.push({ cardId: s.cardId, kind: 'review' })
    if ((i + 1) % gap === 0 && n < newCards.length) {
      out.push({ cardId: newCards[n++].id, kind: 'new' })
    }
  })
  for (; n < newCards.length; n++) out.push({ cardId: newCards[n].id, kind: 'new' })
  return out
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
