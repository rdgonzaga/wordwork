export const ARTICLES = ['der', 'die', 'das'] as const

export type Article = (typeof ARTICLES)[number]

export function isArticle(value: string | undefined): value is Article {
  return (ARTICLES as readonly string[]).includes(value ?? '')
}
