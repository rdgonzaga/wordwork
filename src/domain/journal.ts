export const MAX_SENTENCE_LENGTH = 1_000
export const MAX_NOTES_LENGTH = 2_000

/** `https://…` or `http://…` as typed, or undefined for blanks and anything else (`javascript:`). */
export function safeUrl(input: string | undefined): string | undefined {
  const value = input?.trim()
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

export function diaryId(day: string, language: string): string {
  return `${day}:${language}`
}

export function songId(weekOf: string, language: string): string {
  return `${weekOf}:${language}`
}
