import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetEnvCache } from '../../config/env.js'
import { scoreMatch } from '../match.js'
import { ProviderError, RetryableError } from '../types.js'
import { Throttle } from '../throttle.js'
import { tmdbAnime, tmdbMovies } from '../tmdb.js'
import { rawg } from '../rawg.js'
import { jikan } from '../jikan.js'
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
  Object.assign(process.env, extra)
  resetEnvCache()
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('scoreMatch', () => {
  it('accepts an exact title and rejects a wrong-year sequel', () => {
    expect(scoreMatch({ title: 'Inception', year: 2010, need: ['poster'] }, { title: 'Inception', year: 2010 })).toBeGreaterThanOrEqual(0.6)
    expect(scoreMatch({ title: 'Inception', year: 2010, need: ['poster'] }, { title: 'Inception', year: 2020 })).toBeLessThan(0.6)
    expect(scoreMatch({ title: 'Triangle of Sadness (2022)', year: 2022, need: ['poster'] }, { title: 'Triangle of Sadness', year: 2022 })).toBeGreaterThanOrEqual(0.6)
    expect(scoreMatch({ title: 'Tom & Jerry', year: null, need: ['poster'] }, { title: 'Tom and Jerry', year: null })).toBeGreaterThanOrEqual(0.6)
    expect(scoreMatch({ title: 'The 40-Year-Old Virgin', year: 2005, need: ['poster'] }, { title: 'The 40 Year-Old Virgin', year: 2005 })).toBeGreaterThanOrEqual(0.6)
    expect(scoreMatch({ title: 'YuYu Hakusho', year: 1992, need: ['poster'] }, { title: 'Yu Yu Hakusho', year: 1992 })).toBeGreaterThanOrEqual(0.6)
    expect(scoreMatch({ title: "Baldur's Gate 3", year: 2023, need: ['poster'] }, { title: "Baldur's Gate III", year: 2023 })).toBeGreaterThanOrEqual(0.6)
  })
})

describe('Throttle', () => {
  it('retries 429 twice and then throws ProviderError', async () => {
    vi.useFakeTimers()
    const throttle = new Throttle(0)
    let calls = 0
    const promise = throttle.run(async () => {
      calls += 1
      throw new RetryableError(5)
    }).then(() => undefined, (error: unknown) => error)
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeInstanceOf(ProviderError)
    expect(calls).toBe(3)
  })
})

describe('providers', () => {
  it('asks TMDB and OMDb only for a rating, and only searches for a poster', async () => {
    installEnv()
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(String(url))
      if (String(url).includes('/search/movie')) return Response.json({ results: [{ id: 1, title: 'Inception', release_date: '2010-07-16', poster_path: '/abc.jpg' }] })
      if (String(url).includes('/movie/1')) return Response.json({ vote_average: 9.9, imdb_id: 'tt1375666', credits: { crew: [{ job: 'Director', name: 'Christopher Nolan' }] }, belongs_to_collection: { name: 'Inception Collection' }, external_ids: { imdb_id: 'tt1375666' } })
      if (String(url).includes('omdbapi')) return Response.json({ Response: 'True', imdbRating: 'N/A' })
      return Response.json({})
    }))
    const rating = await tmdbMovies.lookup({ title: 'Inception', year: 2010, need: ['imdbRating'] })
    expect(rating?.poster).toBeUndefined()
    expect(rating?.imdbRating).toBeUndefined()
    expect(calls.some((url) => url.includes('omdbapi'))).toBe(true)
    expect(calls.some((url) => url.includes('/movie/1'))).toBe(true)
    calls.length = 0
    const poster = await tmdbMovies.lookup({ title: 'Inception', year: 2010, need: ['poster'] })
    expect(calls).toHaveLength(1)
    expect(poster?.poster).toContain('https://image.tmdb.org')
    expect(JSON.stringify(poster)).not.toContain('tmdb-token')
    expect(poster?.poster).toBe('https://image.tmdb.org/t/p/w500/abc.jpg')
  })

  it('strips a trailing year and searches again without the year filter', async () => {
    installEnv()
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      if (String(url).includes('year=2022')) return Response.json({ results: [] })
      if (String(url).includes('/search/movie')) return Response.json({ results: [{ id: 5, title: 'Triangle of Sadness', release_date: '2022-09-18', poster_path: '/sad.jpg' }] })
      return Response.json({})
    }))
    const match = await tmdbMovies.lookup({ title: 'Triangle of Sadness (2022)', year: 2022, need: ['poster'] })
    expect(match?.poster).toBe('https://image.tmdb.org/t/p/w500/sad.jpg')
    const decoded = decodeURIComponent((urls[0] ?? '').replaceAll('+', ' '))
    expect(decoded).toContain('query=Triangle of Sadness')
    expect(decoded).not.toContain('(2022)')
    expect(urls.some((url) => url.includes('/search/movie') && !url.includes('year='))).toBe(true)
  })

  it('accepts the only year-matching hit when the title is an alternate name', async () => {
    installEnv()
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ results: [{ id: 671, title: "Harry Potter and the Philosopher's Stone", release_date: '2001-11-16', poster_path: '/hp.jpg' }] })))
    const match = await tmdbMovies.lookup({ title: "Harry Potter and the Sorcerer's Stone", year: 2001, need: ['poster'] })
    expect(match?.poster).toBe('https://image.tmdb.org/t/p/w500/hp.jpg')
  })

  it('tries the TV endpoint before the movie endpoint for anime', async () => {
    installEnv()
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      if (String(url).includes('/search/tv')) return Response.json({ results: [] })
      if (String(url).includes('/search/movie')) return Response.json({ results: [{ id: 9, title: 'Your Name.', release_date: '2016-08-26', poster_path: '/yn.jpg' }] })
      return Response.json({})
    }))
    const match = await tmdbAnime.lookup({ title: 'Your Name', year: 2016, need: ['poster'] })
    expect(urls[0]).toContain('/search/tv')
    expect(urls.findIndex((url) => url.includes('/search/movie'))).toBeGreaterThan(0)
    expect(match?.poster).toBe('https://image.tmdb.org/t/p/w500/yn.jpg')
  })

  it('maps RAWG, Jikan, and Open Library ratings', async () => {
    installEnv()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('rawg.io')) return Response.json({ results: [{ id: 1, name: 'Hades', released: '2020-09-17', background_image: 'https://img.example/h.jpg', metacritic: 88, rating: 4.2, ratings_count: 50 }] })
      if (String(url).includes('jikan')) return Response.json({ data: [{ mal_id: 1, title: 'Cowboy Bebop', year: 1998, score: 8.754, images: { jpg: { large_image_url: 'https://img.example/b.jpg' } }, studios: [{ name: 'Sunrise' }] }] })
      return Response.json({ docs: [{ title: 'Dune', first_publish_year: 1965, cover_i: 12, author_name: ['Frank Herbert'], ratings_average: 4.1, ratings_count: 10 }] })
    }))
    expect((await rawg.lookup({ title: 'Hades', year: 2020, need: ['imdbRating'] }))?.imdbRating).toBe(8.8)
    expect((await jikan.lookup({ title: 'Cowboy Bebop', year: 1998, need: ['imdbRating'] }))?.imdbRating).toBe(8.8)
    expect((await openLibrary.lookup({ title: 'Dune', year: 1965, need: ['imdbRating'] }))?.imdbRating).toBe(8.2)
  })

  it('omits an Open Library rating when there are too few votes and a RAWG fallback when metacritic is missing', async () => {
    installEnv()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('rawg.io')) return Response.json({ results: [{ id: 2, name: 'Hades', released: '2020-09-17', rating: 4.2, ratings_count: 50 }] })
      return Response.json({ docs: [{ title: 'Dune', first_publish_year: 1965, ratings_average: 4.1, ratings_count: 2 }] })
    }))
    expect((await rawg.lookup({ title: 'Hades', year: 2020, need: ['imdbRating'] }))?.imdbRating).toBe(8.4)
    expect((await openLibrary.lookup({ title: 'Dune', year: 1965, need: ['imdbRating'] }))?.imdbRating).toBeUndefined()
  })

  it('uses an Open Library ISBN when the matched edition has no cover id', async () => {
    installEnv()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('search.json')) return Response.json({ docs: [{ title: 'Beyond Good and Evil', first_publish_year: 1886, isbn: ['978-1979466073'], author_name: ['Friedrich Nietzsche'] }] })
      return new Response(null, { status: String(url).includes('9781979466073') ? 200 : 404 })
    }))
    const match = await openLibrary.lookup({ title: 'Beyond Good and Evil', year: 1886, author: 'Friedrich Nietzsche', need: ['poster'] })
    expect(match?.poster).toBe('https://covers.openlibrary.org/b/isbn/9781979466073-L.jpg')
  })

  it('asks OMDb by title when TMDB has no imdb id, and keeps a numeric rating', async () => {
    installEnv()
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      if (String(url).includes('/search/movie')) return Response.json({ results: [{ id: 1, title: 'Inception', release_date: '2010-07-16', poster_path: '/abc.jpg' }] })
      if (String(url).includes('/movie/1')) return Response.json({ external_ids: { imdb_id: null }, vote_average: 8 })
      if (String(url).includes('omdbapi')) return Response.json({ Response: 'True', imdbRating: '8.6' })
      return Response.json({})
    }))
    const match = await tmdbMovies.lookup({ title: 'Inception', year: 2010, need: ['imdbRating'] })
    expect(match?.imdbRating).toBe(8.6)
    const omdb = urls.find((url) => url.includes('omdbapi')) ?? ''
    expect(decodeURIComponent(omdb)).toContain('t=Inception')
    expect(omdb).not.toContain('i=tt')
  })
})
