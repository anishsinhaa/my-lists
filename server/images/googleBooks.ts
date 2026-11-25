import { normalizeTitle, stripTrailingYear } from '../../src/lib/normalize.js'
import { getEnv } from '../config/env.js'
import { fetchJson } from './http.js'
import { Throttle } from './throttle.js'

const throttle = new Throttle(1000)
const SIZES = ['extraLarge', 'large', 'medium', 'thumbnail', 'smallThumbnail'] as const

function encodePart(value: string): string {
  return encodeURIComponent(value).replaceAll('%20', '+')
}

export function googleBooksSearchUrl(title: string, author: string | undefined, isbn: string | undefined, key: string): string {
  const q = isbn !== undefined && isbn.length > 0
    ? `isbn:${encodeURIComponent(isbn)}`
    : author !== undefined && author.length > 0
      ? `intitle:${encodePart(title)}+inauthor:${encodePart(author)}`
      : `intitle:${encodePart(title)}`
  const base = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&printType=books`
  return key.length > 0 ? `${base}&key=${encodeURIComponent(key)}` : base
}

export function cleanGoogleCoverUrl(raw: string): string {
  const url = new URL(raw.trim().replace(/^http:\/\//i, 'https://'))
  url.protocol = 'https:'
  url.searchParams.delete('edge')
  url.searchParams.set('zoom', '1')
  return url.toString()
}

export function pickGoogleCover(links: Record<string, unknown> | null | undefined): string | null {
  if (links === null || links === undefined) return null
  for (const size of SIZES) {
    const value = links[size]
    if (typeof value === 'string' && value.length > 0) return cleanGoogleCoverUrl(value)
  }
  return null
}

function volumeInfo(entry: unknown): { title: string; authors: string[]; links: Record<string, unknown> | null } {
  if (typeof entry !== 'object' || entry === null) return { title: '', authors: [], links: null }
  const info = (entry as { volumeInfo?: unknown }).volumeInfo
  if (typeof info !== 'object' || info === null) return { title: '', authors: [], links: null }
  const record = info as Record<string, unknown>
  const authors = Array.isArray(record.authors) ? record.authors.filter((name): name is string => typeof name === 'string') : []
  const links = typeof record.imageLinks === 'object' && record.imageLinks !== null ? record.imageLinks as Record<string, unknown> : null
  return { title: typeof record.title === 'string' ? record.title : '', authors, links }
}

export function bestGoogleVolume(title: string, author: string | undefined, items: unknown[]): unknown | null {
  let best: { item: unknown; score: number } | null = null
  const wanted = normalizeTitle(stripTrailingYear(title))
  const wantedAuthor = author === undefined ? '' : normalizeTitle(author)
  for (const item of items) {
    const info = volumeInfo(item)
    const got = normalizeTitle(info.title)
    if (wanted.length === 0 || got.length === 0) continue
    let score = 0
    if (wanted === got) score = 0.8
    else if (got.includes(wanted) || wanted.includes(got)) score = 0.5
    else continue
    if (wantedAuthor.length > 0) {
      const hit = info.authors.some((name) => {
        const normalized = normalizeTitle(name)
        return normalized === wantedAuthor || normalized.includes(wantedAuthor) || wantedAuthor.includes(normalized)
      })
      score += hit ? 0.2 : -0.15
    }
    if (best === null || score > best.score) best = { item, score }
  }
  if (best === null || best.score < 0.6) return null
  return best.item
}

export function isbnFromExtras(row: unknown[], extras: Array<{ header: string; index: number }>): string | undefined {
  const column = extras.find((entry) => entry.header.replace(/\s+/g, '').includes('isbn'))
  if (column === undefined) return undefined
  const raw = row[column.index]
  const clean = (raw === undefined || raw === null ? '' : String(raw)).replace(/[^0-9Xx]/g, '')
  return clean.length >= 10 ? clean : undefined
}

export async function googleBooksCover(query: { title: string; author?: string; isbn?: string }, signal?: AbortSignal): Promise<string | null> {
  try {
    const title = stripTrailingYear(query.title)
    const url = googleBooksSearchUrl(title, query.author, query.isbn, getEnv().GOOGLE_BOOKS_API_KEY)
    const body = await throttle.run(() => fetchJson(url, { signal }))
    const items = typeof body === 'object' && body !== null && Array.isArray((body as { items?: unknown }).items)
      ? (body as { items: unknown[] }).items
      : []
    const volume = bestGoogleVolume(title, query.author, items)
    if (volume === null) return null
    return pickGoogleCover(volumeInfo(volume).links)
  } catch {
    return null
  }
}
