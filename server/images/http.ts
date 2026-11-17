import { getEnv } from '../config/env.js'
import { RetryableError } from './types.js'

function networkFailure(error: unknown): boolean {
  return error instanceof TypeError && error.message === 'fetch failed'
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  let last: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const timeout = AbortSignal.timeout(8000)
      const signal = init.signal === undefined || init.signal === null ? timeout : AbortSignal.any([init.signal, timeout])
      const response = await fetch(url, { ...init, signal })
      if (response.status === 429) {
        const header = Number(response.headers.get('retry-after'))
        throw new RetryableError(Number.isFinite(header) ? header * 1000 : 500)
      }
      if (!response.ok) throw new Error(`upstream ${response.status}`)
      return response.json() as Promise<unknown>
    } catch (error) {
      last = error
      if (!networkFailure(error) || attempt === 2) throw error
      await sleep(400 * (attempt + 1))
    }
  }
  throw last instanceof Error ? last : new Error('fetch failed')
}

export function authHeaders(): Record<string, string> {
  return { authorization: `Bearer ${getEnv().TMDB_READ_TOKEN}`, accept: 'application/json' }
}

let warnedOmdb = false

export function omdbKey(): string {
  const key = getEnv().OMDB_API_KEY
  if (key.length === 0 && !warnedOmdb) {
    warnedOmdb = true
    console.warn('OMDB_API_KEY missing; IMDb ratings will not be filled')
  }
  return key
}
