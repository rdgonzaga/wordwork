import { useSyncExternalStore } from 'react'
import { db, type LangCode } from '../db/schema.ts'
import { languages } from '../languages/index.ts'
import { useLive } from './useLive.ts'

const KEY = 'wordwork.language'
const listeners = new Set<() => void>()
// Used when storage is blocked, so the picker still works for the session.
let fallback: string | null = null

export function getStoredLanguage(): string | null {
  try {
    return localStorage.getItem(KEY) ?? fallback
  } catch {
    return fallback
  }
}

export function setActiveLanguage(code: LangCode): void {
  fallback = code
  try {
    localStorage.setItem(KEY, code)
  } catch {
    // storage unavailable; the pick still holds for this session
  }
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** The stored pick if that language still has a deck, else the first language that does. */
export function pickLanguage(
  stored: string | null,
  available: readonly LangCode[],
): LangCode | undefined {
  return stored && available.includes(stored) ? stored : available[0]
}

async function languagesWithDecks(): Promise<LangCode[]> {
  const have = new Set((await db.decks.toArray()).filter((d) => !d.deleted).map((d) => d.language))
  return languages.map((l) => l.code).filter((code) => have.has(code))
}

export interface ActiveLanguage {
  /** False until the first read of the decks, so screens don't flash "no deck". */
  loaded: boolean
  active: LangCode | undefined
  /** Languages that have a live deck, in registry order. */
  available: LangCode[]
}

export function useActiveLanguage(): ActiveLanguage {
  const stored = useSyncExternalStore(subscribe, getStoredLanguage)
  const available = useLive(languagesWithDecks)

  return {
    loaded: available !== undefined,
    active: available && pickLanguage(stored, available),
    available: available ?? [],
  }
}
