import { getEnv } from '../config/env.js'
import { bestMatch } from './match.js'
import { fetchJson } from './http.js'
import { Throttle } from './throttle.js'
import { rating, wants, type PosterProvider } from './types.js'

const throttle = new Throttle(250)

export const rawg: PosterProvider = {
  id: 'rawg',
  async lookup(query, signal) {
    const params = new URLSearchParams({ search: query.title, page_size: '5', key: getEnv().RAWG_API_KEY })
    const body = await throttle.run(() => fetchJson(`https://api.rawg.io/api/games?${params.toString()}`, { signal }))
    const results = Array.isArray((body as { results?: unknown[] }).results) ? (body as { results: unknown[] }).results : []
    const candidates = results.map((entry) => {
      const row = typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {}
      const released = typeof row.released === 'string' ? Number(row.released.slice(0, 4)) : null
      return { title: typeof row.name === 'string' ? row.name : '', year: Number.isFinite(released) ? released : null, row }
    })
    const chosen = bestMatch(query, candidates)
    if (chosen === null) return null
    const row = chosen.item.row
    const match = { sourceId: String(row.id ?? chosen.item.title), confidence: chosen.confidence }
    if (wants(query, 'poster') && typeof row.background_image === 'string') Object.assign(match, { poster: row.background_image })
    if (wants(query, 'imdbRating')) {
      const metacritic = typeof row.metacritic === 'number' ? rating(row.metacritic / 10) : undefined
      const fallback = typeof row.rating === 'number' && typeof row.ratings_count === 'number' && row.ratings_count >= 20 ? rating(row.rating * 2) : undefined
      const value = metacritic ?? fallback
      if (value !== undefined) Object.assign(match, { imdbRating: value })
    }
    return match
  },
}
