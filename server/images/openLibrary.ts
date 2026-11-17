import { stripTrailingYear } from '../../src/lib/normalize.js'
import { getEnv } from '../config/env.js'
import { bestMatch } from './match.js'
import { fetchJson } from './http.js'
import { logSample } from './samples.js'
import { Throttle } from './throttle.js'
import { rating, wants, type PosterLookup, type PosterProvider } from './types.js'

const throttle = new Throttle(1000)

async function search(title: string, author: string | undefined, signal?: AbortSignal): Promise<unknown[]> {
  const params = new URLSearchParams({ title, limit: '5', fields: 'title,first_publish_year,cover_i,author_name,ratings_average,ratings_count' })
  if (author !== undefined && author.length > 0) params.set('author', author)
  const body = await throttle.run(() => fetchJson(`https://openlibrary.org/search.json?${params.toString()}`, { signal, headers: { 'user-agent': `my-lists (${getEnv().OPEN_LIBRARY_CONTACT})` } }))
  const docs = Array.isArray((body as { docs?: unknown[] }).docs) ? (body as { docs: unknown[] }).docs : []
  logSample('openlibrary', docs[0] ?? body)
  return docs
}

function choose(query: PosterLookup, title: string, docs: unknown[]) {
  const candidates = docs.map((entry) => {
    const row = typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {}
    return { title: typeof row.title === 'string' ? row.title : '', year: typeof row.first_publish_year === 'number' ? row.first_publish_year : null, row }
  })
  return bestMatch({ ...query, title }, candidates)
}

export const openLibrary: PosterProvider = {
  id: 'openlibrary',
  async lookup(query, signal) {
    const title = stripTrailingYear(query.title)
    const author = query.author?.trim()
    const primary = await search(title, author, signal)
    let chosen = choose(query, title, primary) ?? (query.year === null ? null : choose({ ...query, year: null }, title, primary))
    if (chosen === null && author !== undefined && author.length > 0) {
      const wider = await search(title, undefined, signal)
      chosen = choose(query, title, wider) ?? (query.year === null ? null : choose({ ...query, year: null }, title, wider))
    }
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
