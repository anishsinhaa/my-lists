import { getEnv } from '../config/env.js'
import { RetryableError } from './types.js'

export async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const timeout = AbortSignal.timeout(8000)
  const signal = init.signal === undefined || init.signal === null ? timeout : AbortSignal.any([init.signal, timeout])
  const response = await fetch(url, { ...init, signal })
  if (response.status === 429) {
    const header = Number(response.headers.get('retry-after'))
    throw new RetryableError(Number.isFinite(header) ? header * 1000 : 500)
  }
  if (!response.ok) throw new Error(`upstream ${response.status}`)
  return response.json() as Promise<unknown>
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
