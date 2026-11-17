import { fetchJson, omdbKey } from './http.js'
import { logSample } from './samples.js'
import { rating } from './types.js'

export async function omdbRating(input: { imdbId?: string; title: string; year: number | null; type: 'movie' | 'series' }, signal?: AbortSignal): Promise<number | undefined> {
  const key = omdbKey()
  if (key.length === 0) return undefined
  const params = new URLSearchParams({ apikey: key })
  if (input.imdbId !== undefined && input.imdbId.length > 0) params.set('i', input.imdbId)
  else {
    params.set('t', input.title)
    params.set('type', input.type)
    if (input.year !== null) params.set('y', String(input.year))
  }
  const body = await fetchJson(`https://www.omdbapi.com/?${params.toString()}`, { signal })
  logSample('omdb', body)
  if (typeof body !== 'object' || body === null) return undefined
  const record = body as { Response?: string; imdbRating?: string }
  if (record.Response === 'False' || record.imdbRating === undefined || record.imdbRating === 'N/A') return undefined
  return rating(Number(record.imdbRating))
}
