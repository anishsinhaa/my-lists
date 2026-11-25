import { normalizeTitle, stripTrailingYear } from '../../src/lib/normalize.js'
import { getEnv } from '../config/env.js'
import { scoreMatch } from './match.js'
import { fetchJson } from './http.js'
import { logSample } from './samples.js'
import { Throttle } from './throttle.js'
import { googleBooksCover } from './googleBooks.js'
import { rating, wants, type PosterLookup, type PosterProvider } from './types.js'

const throttle = new Throttle(1000)

function rowOf(entry: unknown): Record<string, unknown> {
  return typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : {}
}

async function search(title: string, author: string | undefined, signal?: AbortSignal): Promise<unknown[]> {
  const params = new URLSearchParams({ title, limit: '8', fields: 'title,first_publish_year,cover_i,isbn,author_name,ratings_average,ratings_count' })
  if (author !== undefined && author.length > 0) params.set('author', author)
  const body = await throttle.run(() => fetchJson(`https://openlibrary.org/search.json?${params.toString()}`, { signal, headers: { 'user-agent': `my-lists (${getEnv().OPEN_LIBRARY_CONTACT})` } }))
  const docs = Array.isArray((body as { docs?: unknown[] }).docs) ? (body as { docs: unknown[] }).docs : []
  logSample('openlibrary', docs[0] ?? body)
  return docs
}

function ranked(query: PosterLookup, title: string, docs: unknown[]) {
  return docs.map((entry) => {
    const row = rowOf(entry)
    const item = { title: typeof row.title === 'string' ? row.title : '', year: typeof row.first_publish_year === 'number' ? row.first_publish_year : null, row }
    const confidence = scoreMatch({ ...query, title }, item)
    const exact = normalizeTitle(title) === normalizeTitle(item.title)
    return { item, confidence: exact ? Math.max(confidence, 0.7) : confidence }
  }).filter((entry) => entry.confidence >= 0.6).sort((left, right) => right.confidence - left.confidence)
}

async function coverFrom(row: Record<string, unknown>, signal?: AbortSignal): Promise<string | undefined> {
  if (typeof row.cover_i === 'number') return `https://covers.openlibrary.org/b/id/${row.cover_i}-L.jpg`
  const isbns = Array.isArray(row.isbn) ? row.isbn.filter((value): value is string => typeof value === 'string').slice(0, 4) : []
  for (const isbn of isbns) {
    const clean = isbn.replace(/[^0-9Xx]/g, '')
    if (clean.length < 10) continue
    const url = `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg?default=false`
    try {
      const response = await fetch(url, { method: 'GET', signal, headers: { 'user-agent': `my-lists (${getEnv().OPEN_LIBRARY_CONTACT})` } })
      if (response.ok) return `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`
    } catch {
      continue
    }
  }
  return undefined
}

async function optionsFor(query: PosterLookup, title: string, author: string | undefined, signal?: AbortSignal) {
  const primary = await search(title, author, signal)
  let options = ranked(query, title, primary)
  if (options.length === 0 && query.year !== null) options = ranked({ ...query, year: null }, title, primary)
  if (options.length === 0 && author !== undefined && author.length > 0) {
    const wider = await search(title, undefined, signal)
    options = ranked(query, title, wider)
    if (options.length === 0 && query.year !== null) options = ranked({ ...query, year: null }, title, wider)
  }
  return options
}

export const openLibrary: PosterProvider = {
  id: 'openlibrary',
  async lookup(query, signal) {
    const title = stripTrailingYear(query.title)
    const author = query.author?.trim()
    const options = await optionsFor(query, title, author, signal)
    const first = options[0]
    if (first === undefined) {
      if (!wants(query, 'poster')) return null
      const cover = await googleBooksCover({ title, author, isbn: query.isbn }, signal)
      return cover === null ? null : { poster: cover, sourceId: title, confidence: 0.7 }
    }
    let chosen = first
    let poster: string | undefined
    if (wants(query, 'poster')) {
      for (const entry of options) {
        const url = await coverFrom(entry.item.row, signal)
        if (url === undefined) continue
        poster = url
        chosen = entry
        break
      }
      if (poster === undefined) {
        const cover = await googleBooksCover({ title, author, isbn: query.isbn }, signal)
        if (cover !== null) poster = cover
      }
    }
    const authors = Array.isArray(chosen.item.row.author_name) ? chosen.item.row.author_name : []
    const match = { sourceId: chosen.item.title, confidence: chosen.confidence }
    if (poster !== undefined) Object.assign(match, { poster })
    if (wants(query, 'creator') && typeof authors[0] === 'string') Object.assign(match, { creator: authors[0] })
    const row = chosen.item.row
    if (wants(query, 'imdbRating') && typeof row.ratings_average === 'number' && typeof row.ratings_count === 'number' && row.ratings_count >= 3) {
      const value = rating(row.ratings_average * 2)
      if (value !== undefined) Object.assign(match, { imdbRating: value })
    }
    return match
  },
}
