import { bestMatch } from './match.js'
import { authHeaders, fetchJson } from './http.js'
import { omdbRating } from './omdb.js'
import { Throttle } from './throttle.js'
import { wants, type PosterLookup, type PosterMatch, type PosterProvider } from './types.js'

const tmdbThrottle = new Throttle(120)
const omdbThrottle = new Throttle(250)

function yearOf(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const year = Number(value.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

async function search(kind: 'movie' | 'tv', query: PosterLookup, signal?: AbortSignal): Promise<PosterMatch | null> {
  const params = new URLSearchParams({ query: query.title })
  if (query.year !== null) params.set(kind === 'movie' ? 'year' : 'first_air_date_year', String(query.year))
  const body = await tmdbThrottle.run(() => fetchJson(`https://api.themoviedb.org/3/search/${kind}?${params.toString()}`, { headers: authHeaders(), signal }))
  const results = Array.isArray(record(body).results) ? record(body).results as unknown[] : []
  const candidates = results.map((entry) => {
    const row = record(entry)
    const title = kind === 'movie' ? row.title : row.name
    return {
      title: typeof title === 'string' ? title : '',
      year: yearOf(kind === 'movie' ? row.release_date : row.first_air_date),
      id: typeof row.id === 'number' ? row.id : 0,
      posterPath: typeof row.poster_path === 'string' ? row.poster_path : '',
    }
  })
  const chosen = bestMatch(query, candidates)
  if (chosen === null) return null
  const match: PosterMatch = { sourceId: String(chosen.item.id), confidence: chosen.confidence }
  if (wants(query, 'poster') && chosen.item.posterPath.length > 0) match.poster = `https://image.tmdb.org/t/p/w500${chosen.item.posterPath}`
  const needsDetails = wants(query, 'creator') || wants(query, 'franchise') || wants(query, 'imdbRating')
  if (!needsDetails) return match
  const details = record(await tmdbThrottle.run(() => fetchJson(`https://api.themoviedb.org/3/${kind}/${chosen.item.id}?append_to_response=${kind === 'movie' ? 'credits,external_ids' : 'external_ids'}`, { headers: authHeaders(), signal })))
  if (kind === 'movie' && wants(query, 'creator')) {
    const crew = Array.isArray(record(details.credits).crew) ? record(details.credits).crew as unknown[] : []
    const director = crew.map(record).find((person) => person.job === 'Director')
    if (typeof director?.name === 'string') match.creator = director.name
  }
  if (kind === 'tv' && wants(query, 'creator')) {
    const created = Array.isArray(details.created_by) ? details.created_by as unknown[] : []
    const name = record(created[0]).name
    if (typeof name === 'string') match.creator = name
  }
  if (kind === 'movie' && wants(query, 'franchise')) {
    const name = record(details.belongs_to_collection).name
    if (typeof name === 'string') match.franchise = name.replace(/ collection$/i, '')
  }
  if (wants(query, 'imdbRating')) {
    const imdbId = record(details.external_ids).imdb_id
    match.imdbRating = await omdbThrottle.run(() => omdbRating({ imdbId: typeof imdbId === 'string' ? imdbId : undefined, title: query.title, year: query.year, type: kind === 'movie' ? 'movie' : 'series' }, signal))
  }
  return match
}

export const tmdbMovies: PosterProvider = { id: 'tmdb', lookup: (query, signal) => search('movie', query, signal) }
export const tmdbSeries: PosterProvider = { id: 'tmdb', lookup: (query, signal) => search('tv', query, signal) }
