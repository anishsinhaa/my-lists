import type { EnrichField } from '../../src/types/media.js'
import type { TabId } from '../../src/types/lists.js'

export interface PosterLookup {
  title: string
  year: number | null
  author?: string
  isbn?: string
  need: EnrichField[]
}

export interface PosterMatch {
  poster?: string
  creator?: string
  franchise?: string
  imdbRating?: number
  sourceId: string
  confidence: number
}

export interface PosterProvider {
  id: 'tmdb' | 'rawg' | 'jikan' | 'openlibrary'
  lookup(query: PosterLookup, signal?: AbortSignal): Promise<PosterMatch | null>
}

export class ProviderError extends Error {
  readonly code = 'provider_error' as const
  constructor(message: string) {
    super(message)
    this.name = 'ProviderError'
  }
}

export class RetryableError extends Error {
  readonly retryAfterMs: number

  constructor(retryAfterMs: number) {
    super('retry')
    this.name = 'RetryableError'
    this.retryAfterMs = retryAfterMs
  }
}

export function wants(query: PosterLookup, field: EnrichField): boolean {
  return query.need.includes(field)
}

export function rating(value: number): number | undefined {
  if (!Number.isFinite(value)) return undefined
  const rounded = Math.round(value * 10) / 10
  if (rounded <= 0 || rounded > 10) return undefined
  return rounded
}

export type { TabId }
