import { getEnv } from '../config/env.js'
import { bestMatch } from './match.js'
import { fetchJson } from './http.js'
import { Throttle } from './throttle.js'
import { rating, wants, type PosterProvider } from './types.js'

const throttle = new Throttle(1000)

export const openLibrary: PosterProvider = {
  id: 'openlibrary',
  async lookup(query, signal) {
    const params = new URLSearchParams({ title: query.title, limit: '5', fields: 'title,first_publish_year,cover_i,author_name,ratings_average,ratings_count' })
    const body = await throttle.run(() => fetchJson(`https://openlibrary.org/search.json?${params.toString()}`, { signal, headers: { 'user-agent': `my-lists (${getEnv().OPEN_LIBRARY_CONTACT})` } }))
    const docs = Array.isArray((body as { docs?: unknown[] }).docs) ? (body as { docs: unknown[] }).docs : []
    const candidates = docs.map((entry) => {
      const row = typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {}
      return { title: typeof row.title === 'string' ? row.title : '', year: typeof row.first_publish_year === 'number' ? row.first_publish_year : null, row }
    })
    const chosen = bestMatch(query, candidates)
    if (chosen === null) return null
    const row = chosen.item.row
    const authors = Array.isArray(row.author_name) ? row.author_name : []
    const match = { sourceId: chosen.item.title, confidence: chosen.confidence }
    if (wants(query, 'poster') && typeof row.cover_i === 'number') Object.assign(match, { poster: `https://covers.openlibrary.org/b/id/${row.cover_i}-L.jpg` })
    if (wants(query, 'creator') && typeof authors[0] === 'string') Object.assign(match, { creator: authors[0] })
    if (wants(query, 'imdbRating') && typeof row.ratings_average === 'number' && typeof row.ratings_count === 'number' && row.ratings_count >= 3) {
      const value = rating(row.ratings_average * 2)
      if (value !== undefined) Object.assign(match, { imdbRating: value })
    }
    return match
  },
}
