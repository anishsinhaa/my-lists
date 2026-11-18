export type MainField = 'title' | 'status' | 'year' | 'genre' | 'why' | 'notes' | 'updatedAt' | 'poster' | 'creator' | 'franchise' | 'myRating' | 'imdbRating' | 'platform'
export type PicksField = 'title' | 'because' | 'year' | 'genre' | 'status' | 'why' | 'poster'

const DESCRIPTION = ['description', 'why', 'reason', "notes / why it's on the list", "notes / why it’s on the list", "why it's on the list", "why it's on my list"]

export const MAIN_ALIASES: Record<MainField, string[]> = {
  title: ['title', 'name'],
  status: ['status'],
  year: ['year', 'release year'],
  genre: ['genre', 'genres'],
  why: DESCRIPTION,
  notes: ['notes', 'note', 'my notes'],
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
  why: DESCRIPTION,
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
  const chosen: Partial<Record<F, string>> = {}
  const extras: Array<{ header: string; index: number }> = []
  const labels = headerRow.map((cell) => normalizeHeader(cell))
  labels.forEach((label, column) => {
    if (label.length === 0) return
    const field = (Object.keys(aliases) as F[]).find((candidate) => aliases[candidate].includes(label))
    if (field === undefined) {
      extras.push({ header: label, index: column })
      return
    }
    const current = index[field]
    const names = aliases[field]
    const nextRank = names.indexOf(label)
    const currentRank = names.indexOf(chosen[field] ?? '')
    if (current === undefined || (nextRank !== -1 && nextRank < currentRank)) {
      if (current !== undefined) extras.push({ header: chosen[field] ?? '', index: current })
      index[field] = column
      chosen[field] = label
      return
    }
    extras.push({ header: label, index: column })
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
