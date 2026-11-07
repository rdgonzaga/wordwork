import { toDay } from '../domain/day.ts'
import { buildQueue, countToday, type QueueItem } from '../domain/srs/queue.ts'
import { newSchedule, replay, schedule } from '../domain/srs/scheduler.ts'
import { getSyncMeta } from './meta.ts'
import type { Card, Rating, Review, Schedule, Settings, WordworkDb } from './schema.ts'
import { getSettings } from './settings.ts'
import { stamp } from './stamp.ts'

export interface StudyState {
  settings: Settings
  cards: Map<string, Card>
  schedules: Map<string, Schedule>
  queue: QueueItem[]
}

/**
 * Everything the review screen needs for a deck. Loads every review of the deck's cards (never
 * just today's): the daily limits replay each card's history to know what was new or due.
 */
export async function loadStudyState(
  db: WordworkDb,
  deckId: string,
  now: Date,
): Promise<StudyState> {
  const settings = await getSettings(db)
  const cardList = (await db.cards.where('deckId').equals(deckId).toArray()).filter(
    (c) => !c.deleted,
  )
  const reviews = await db.reviews
    .where('cardId')
    .anyOf(cardList.map((c) => c.id))
    .toArray()

  const byCard = new Map<string, Review[]>()
  for (const r of reviews) {
    const list = byCard.get(r.cardId)
    if (list) list.push(r)
    else byCard.set(r.cardId, [r])
  }

  const schedules = new Map<string, Schedule>()
  for (const card of cardList) {
    const list = byCard.get(card.id)
    if (list?.some((r) => !r.deleted)) schedules.set(card.id, replay(card.id, list, settings))
  }

  const counts = countToday(reviews, now, settings)
  const queue = buildQueue({ cards: cardList, schedules, counts, now, settings })
  return { settings, cards: new Map(cardList.map((c) => [c.id, c])), schedules, queue }
}

/** Logs a rating and updates the card's cached schedule. Returns the review and the new schedule. */
export async function rateCard(
  db: WordworkDb,
  cardId: string,
  rating: Rating,
  now: Date,
  durationMs: number,
): Promise<{ review: Review; schedule: Schedule }> {
  const settings = await getSettings(db)
  const deviceId = (await getSyncMeta(db)).deviceId
  return db.transaction('rw', db.reviews, db.schedules, async () => {
    const existing = await db.reviews.where('cardId').equals(cardId).toArray()
    const current = replay(cardId, existing, settings)
    const review: Review = {
      id: crypto.randomUUID(),
      cardId,
      rating,
      reviewedAt: now.getTime(),
      day: toDay(now, settings),
      durationMs,
      deviceId,
      updatedAt: now.getTime(),
      deleted: false,
      dirty: 1,
    }
    const next = schedule(current, rating, now, settings)
    await db.reviews.add(review)
    await db.schedules.put(next)
    return { review, schedule: next }
  })
}

/** Tombstones a review and rebuilds that card's schedule from what's left. */
export async function undoReview(
  db: WordworkDb,
  reviewId: string,
  now: Date,
): Promise<Schedule | undefined> {
  const settings = await getSettings(db)
  return db.transaction('rw', db.reviews, db.schedules, async () => {
    const review = await db.reviews.get(reviewId)
    if (!review) return undefined
    await db.reviews.update(reviewId, {
      deleted: true,
      dirty: 1,
      updatedAt: stamp(review.updatedAt, now),
    })
    const rest = await db.reviews.where('cardId').equals(review.cardId).toArray()
    if (!rest.some((r) => !r.deleted)) {
      await db.schedules.delete(review.cardId)
      return newSchedule(review.cardId)
    }
    const next = replay(review.cardId, rest, settings)
    await db.schedules.put(next)
    return next
  })
}
