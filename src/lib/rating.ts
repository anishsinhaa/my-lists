import type { ListId } from '../types/lists.ts'

export function parseRating(value: unknown): number | null {
  if (typeof value === 'number') return inRange(value)
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (text.length === 0 || /^n\/a$/i.test(text)) return null
  const stars = text.match(/[★⭐]/gu)
  if (stars !== null && stars.length === [...text].length) return inRange(stars.length * 2)
  const percent = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(text)
  if (percent !== null) return inRange(Number(percent[1].replace(',', '.')) / 10)
  const ratio = /^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/.exec(text)
  if (ratio !== null) {
    const numerator = Number(ratio[1].replace(',', '.'))
    const denominator = Number(ratio[2].replace(',', '.'))
    if (denominator === 0) return null
    return inRange((numerator / denominator) * 10)
  }
  const decimal = text.replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(decimal)) return null
  return inRange(Number(decimal))
}

function inRange(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || value > 10) return null
  return Math.round(value * 10) / 10
}

export function effectiveRating(item: { myRating: number | null; imdbRating: number | null }): number | null {
  return item.myRating ?? item.imdbRating
}

export function externalRatingLabel(listId: ListId): string {
  if (listId === 'movies' || listId === 'series' || listId === 'anime') return 'IMDb'
  if (listId === 'games') return 'Metacritic'
  if (listId === 'books') return 'Open Library'
  return 'Rating'
}
