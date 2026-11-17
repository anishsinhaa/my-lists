import { getEnv } from '../config/env.js'
import { bestMatch } from './match.js'
import { fetchJson } from './http.js'
import { Throttle } from './throttle.js'
import { rating, wants, type PosterProvider } from './types.js'

const throttle = new Throttle(450)

export const jikan: PosterProvider = {
  id: 'jikan',
  async lookup(query, signal) {
    const params = new URLSearchParams({ q: query.title, limit: '5', sfw: 'true' })
    const body = await throttle.run(() => fetchJson(`${getEnv().JIKAN_BASE_URL}/anime?${params.toString()}`, { signal }))
    const data = Array.isArray((body as { data?: unknown[] }).data) ? (body as { data: unknown[] }).data : []
    const candidates = data.map((entry) => {
      const row = typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {}
      return { title: typeof row.title === 'string' ? row.title : '', year: typeof row.year === 'number' ? row.year : null, row }
    })
    const chosen = bestMatch(query, candidates)
    if (chosen === null) return null
    const row = chosen.item.row
    const images = typeof row.images === 'object' && row.images !== null ? row.images as { jpg?: { large_image_url?: string } } : {}
    const studios = Array.isArray(row.studios) ? row.studios as Array<{ name?: string }> : []
    const match = { sourceId: String(row.mal_id ?? chosen.item.title), confidence: chosen.confidence }
    if (wants(query, 'poster') && typeof images.jpg?.large_image_url === 'string') Object.assign(match, { poster: images.jpg.large_image_url })
    if (wants(query, 'creator') && typeof studios[0]?.name === 'string') Object.assign(match, { creator: studios[0].name })
    if (wants(query, 'imdbRating') && typeof row.score === 'number') {
      const value = rating(row.score)
      if (value !== undefined) Object.assign(match, { imdbRating: value })
    }
    return match
  },
}
