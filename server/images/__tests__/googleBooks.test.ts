import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetEnvCache } from '../../config/env.js'
import { bestGoogleVolume, cleanGoogleCoverUrl, googleBooksSearchUrl, pickGoogleCover } from '../googleBooks.js'
import { openLibrary } from '../openLibrary.js'

function installEnv(extra: Record<string, string> = {}) {
  process.env.AUTH_USERNAME = 'zeus'
  process.env.AUTH_PASSWORD_HASH = 'hash'
  process.env.JWT_SECRET = 'local-dev-secret-that-is-at-least-32-characters'
  process.env.GOOGLE_SHEET_ID = 'sheet'
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'bot@example.com'
  process.env.GOOGLE_PRIVATE_KEY = 'key'
  process.env.TMDB_READ_TOKEN = 'tmdb-token'
  process.env.RAWG_API_KEY = 'rawg-token'
  process.env.OPEN_LIBRARY_CONTACT = 'you@example.com'
  process.env.OMDB_API_KEY = 'omdb-token'
  delete process.env.GOOGLE_BOOKS_API_KEY
  Object.assign(process.env, extra)
  resetEnvCache()
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GOOGLE_BOOKS_API_KEY
  resetEnvCache()
})

describe('Google Books covers', () => {
  it('builds a keyless title query and appends a key only when one is set', () => {
    expect(googleBooksSearchUrl('Dune', 'Frank Herbert', undefined, '')).toBe('https://www.googleapis.com/books/v1/volumes?q=intitle:Dune+inauthor:Frank+Herbert&maxResults=5&printType=books')
    expect(googleBooksSearchUrl('Dune', undefined, '9780441172719', '')).toBe('https://www.googleapis.com/books/v1/volumes?q=isbn:9780441172719&maxResults=5&printType=books')
    expect(googleBooksSearchUrl('Dune', 'Frank Herbert', undefined, 'book-key')).toContain('&key=book-key')
  })

  it('prefers the largest https cover and drops the curled edge', () => {
    const url = pickGoogleCover({
      smallThumbnail: 'http://books.google.com/small?edge=curl',
      thumbnail: 'http://books.google.com/thumb?edge=curl',
      extraLarge: 'http://books.google.com/big?edge=curl&zoom=5',
    })
    expect(url?.startsWith('https://books.google.com/big')).toBe(true)
    expect(url).not.toContain('edge=curl')
    expect(url).toContain('zoom=1')
    expect(cleanGoogleCoverUrl('http://books.google.com/x?edge=curl')).not.toContain('edge')
    expect(bestGoogleVolume('Dune', 'Frank Herbert', [
      { volumeInfo: { title: 'Something Else', authors: ['Frank Herbert'], imageLinks: { thumbnail: 'https://books.google.com/no.jpg' } } },
      { volumeInfo: { title: 'Dune', authors: ['Frank Herbert'], imageLinks: { thumbnail: 'https://books.google.com/yes.jpg' } } },
    ])).toMatchObject({ volumeInfo: { title: 'Dune' } })
  })

  it('asks Google Books only after Open Library returns no cover, and ignores a Google Books failure', async () => {
    installEnv()
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      if (String(url).includes('search.json')) return Response.json({ docs: [{ title: 'Dune', first_publish_year: 1965, author_name: ['Frank Herbert'] }] })
      if (String(url).includes('googleapis.com/books')) {
        return Response.json({ items: [{ volumeInfo: { title: 'Dune', authors: ['Frank Herbert'], imageLinks: { thumbnail: 'http://books.google.com/dune?edge=curl', extraLarge: 'http://books.google.com/dune-large?edge=curl' } } }] })
      }
      return new Response(null, { status: 404 })
    }))
    const filled = await openLibrary.lookup({ title: 'Dune', year: 1965, author: 'Frank Herbert', need: ['poster'] })
    expect(filled?.poster).toContain('https://books.google.com/dune-large')
    expect(filled?.poster).not.toContain('edge=curl')
    expect(filled?.poster).toContain('zoom=1')
    expect(urls.filter((url) => url.includes('googleapis.com/books'))).toHaveLength(1)
    expect(urls.some((url) => url.includes('key='))).toBe(false)

    urls.length = 0
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      if (String(url).includes('search.json')) return Response.json({ docs: [{ title: 'Dune', first_publish_year: 1965, cover_i: 12, author_name: ['Frank Herbert'] }] })
      return Response.json({ items: [] })
    }))
    const covered = await openLibrary.lookup({ title: 'Dune', year: 1965, need: ['poster'] })
    expect(covered?.poster).toBe('https://covers.openlibrary.org/b/id/12-L.jpg')
    expect(urls.some((url) => url.includes('googleapis'))).toBe(false)

    process.env.GOOGLE_BOOKS_API_KEY = 'book-key'
    resetEnvCache()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('search.json')) return Response.json({ docs: [{ title: 'Dune', first_publish_year: 1965 }] })
      throw new Error('boom')
    }))
    const failed = await openLibrary.lookup({ title: 'Dune', year: 1965, isbn: '9780441172719', need: ['poster'] })
    expect(failed?.poster).toBeUndefined()
    expect(googleBooksSearchUrl('Dune', undefined, '9780441172719', 'book-key')).toContain('key=book-key')
  }, 20_000)
})
