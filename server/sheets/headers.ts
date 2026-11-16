export type MainField = 'title' | 'status' | 'year' | 'genre' | 'why' | 'updatedAt' | 'poster' | 'creator' | 'franchise' | 'myRating' | 'imdbRating' | 'platform'
export type PicksField = 'title' | 'because' | 'year' | 'genre' | 'status' | 'why' | 'poster'

export const MAIN_ALIASES: Record<MainField, string[]> = {
  title: ['title', 'name'],
  status: ['status'],
  year: ['year', 'release year'],
  genre: ['genre', 'genres'],
  why: ['why', 'notes', 'note', 'reason'],
  updatedAt: ['updated at', 'updated', 'last updated'],
  poster: ['poster', 'poster url', 'cover'],
  creator: ['director/creator', 'director', 'creator', 'author', 'developer'],
  franchise: ['franchise', 'universe', 'collection'],
  myRating: ['my rating', 'my score', 'rating'],
  imdbRating: ['imdb rating', 'imdb', 'external rating', 'mal score', 'metacritic'],
  platform: ['platform', 'platforms'],
}

export const PICKS_ALIASES: Record<PicksField, string[]> = {
  title: ['title', 'name'],
  because: ['because you liked', 'because'],
  year: ['year'],
  genre: ['genre', 'genres'],
  status: ['status'],
  why: ['why', 'reason'],
  poster: ['poster', 'poster url', 'cover'],
}

export function normalizeHeader(header: unknown): string {
  return String(header ?? '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/:$/, '')
}

export interface ColumnMap<F extends string> {
  index: Partial<Record<F, number>>
  extras: Array<{ header: string; index: number }>
  headerRow: string[]
}

export function buildColumnMap<F extends string>(headerRow: unknown[], aliases: Record<F, string[]>): ColumnMap<F> {
  const index: Partial<Record<F, number>> = {}
  const extras: Array<{ header: string; index: number }> = []
  const labels = headerRow.map((cell) => normalizeHeader(cell))
  labels.forEach((label, column) => {
    if (label.length === 0) return
    const field = (Object.keys(aliases) as F[]).find((candidate) => aliases[candidate].includes(label) && index[candidate] === undefined)
    if (field === undefined) extras.push({ header: label, index: column })
    else index[field] = column
  })
  return { index, extras, headerRow: labels }
}

export function columnLetter(index0: number): string {
  let n = index0 + 1
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}
