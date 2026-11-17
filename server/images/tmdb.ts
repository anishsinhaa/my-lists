import { stripTrailingYear } from '../../src/lib/normalize.js'
import { bestMatch, onlyCandidate } from './match.js'
import { authHeaders, fetchJson, omdbKey } from './http.js'
import { omdbRating } from './omdb.js'
import { logSample } from './samples.js'
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

function posterUrl(path: string): string | undefined {
  if (!path.startsWith('/')) return undefined
  return `https://image.tmdb.org/t/p/w500${path}`
}

interface Candidate {
  title: string
  year: number | null
  id: number
  posterPath: string
}

async function searchOnce(kind: 'movie' | 'tv', title: string, year: number | null, signal?: AbortSignal): Promise<Candidate[]> {
  const params = new URLSearchParams({ query: title })
  if (year !== null) params.set(kind === 'movie' ? 'year' : 'first_air_date_year', String(year))
  const body = await tmdbThrottle.run(() => fetchJson(`https://api.themoviedb.org/3/search/${kind}?${params.toString()}`, { headers: authHeaders(), signal }))
  const results = Array.isArray(record(body).results) ? record(body).results as unknown[] : []
  logSample(`tmdb.search.${kind}`, results[0] ?? body)
  return results.map((entry) => {
    const row = record(entry)
    const name = kind === 'movie' ? row.title : row.name
    return {
      title: typeof name === 'string' ? name : '',
      year: yearOf(kind === 'movie' ? row.release_date : row.first_air_date),
      id: typeof row.id === 'number' ? row.id : 0,
      posterPath: typeof row.poster_path === 'string' ? row.poster_path : '',
    }
  })
}

async function search(kind: 'movie' | 'tv', query: PosterLookup, signal?: AbortSignal): Promise<PosterMatch | null> {
  const title = stripTrailingYear(query.title)
  const wanted = { ...query, title }
  let candidates = await searchOnce(kind, title, query.year, signal)
  let chosen = bestMatch(wanted, candidates) ?? onlyCandidate(wanted, candidates)
  if (chosen === null && query.year !== null) {
    candidates = await searchOnce(kind, title, null, signal)
    chosen = bestMatch(wanted, candidates) ?? onlyCandidate(wanted, candidates)
  }
  if (chosen === null) return null
  const match: PosterMatch = { sourceId: String(chosen.item.id), confidence: chosen.confidence }
  const url = posterUrl(chosen.item.posterPath)
  if (wants(query, 'poster') && url !== undefined) match.poster = url
  const ratingWanted = wants(query, 'imdbRating') && omdbKey().length > 0
  const needsDetails = wants(query, 'creator') || wants(query, 'franchise') || ratingWanted
  if (!needsDetails) return match
  const append = ['external_ids']
  if (kind === 'movie' && (wants(query, 'creator') || wants(query, 'franchise'))) append.unshift('credits')
  const details = record(await tmdbThrottle.run(() => fetchJson(`https://api.themoviedb.org/3/${kind}/${chosen.item.id}?append_to_response=${append.join(',')}`, { headers: authHeaders(), signal })))
  const external = record(details.external_ids)
  logSample(`tmdb.${kind}.details`, { id: details.id, title: details.title ?? details.name, poster_path: details.poster_path, imdb_id: details.imdb_id ?? null, external_ids: details.external_ids ?? null, vote_average: details.vote_average ?? null })
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
  if (ratingWanted) {
    const imdbId = typeof details.imdb_id === 'string' ? details.imdb_id : typeof external.imdb_id === 'string' ? external.imdb_id : undefined
    if (imdbId !== undefined) match.imdbRating = await omdbThrottle.run(() => omdbRating({ imdbId, title, year: query.year, type: kind === 'movie' ? 'movie' : 'series' }, signal))
  }
  return match
}

export const tmdbMovies: PosterProvider = { id: 'tmdb', lookup: (query, signal) => search('movie', query, signal) }
export const tmdbSeries: PosterProvider = { id: 'tmdb', lookup: (query, signal) => search('tv', query, signal) }

export const tmdbAnime: PosterProvider = {
  id: 'tmdb',
  async lookup(query, signal) {
    return (await search('tv', query, signal)) ?? (await search('movie', query, signal))
  },
}
