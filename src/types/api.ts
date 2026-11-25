import type { ListId, PicksId, TabId } from './lists.ts'
import type { EnrichField } from './media.ts'

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'bad_request'
  | 'rate_limited'
  | 'upstream_error'
  | 'feature_disabled'
  | 'not_found'
  | 'conflict'
  | 'internal'

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: ApiErrorCode; message: string } }

export interface PosterFillItem {
  tab: TabId
  title: string
  year: number | null
  because?: string
  needs: EnrichField[]
}

export interface PosterFillResult {
  tab: TabId
  titleKey: string
  becauseKey?: string
  poster: string | null
  creator: string | null
  franchise: string | null
  imdbRating: number | null
  written: Partial<Record<EnrichField, boolean>>
  missed: EnrichField[]
  outcome: 'ok' | 'partial' | 'not_found' | 'already_filled' | 'provider_error' | 'write_skipped'
  detail?: string
}

export interface ItemUpdateRequest {
  listId: ListId
  id: string
  title: string
  year: number | null
  status: string
  myRating: number | null
  notes?: string
  why?: string
  favourite?: boolean
}

export interface ItemUpdateResult {
  outcome: 'written' | 'not_found' | 'ambiguous' | 'invalid'
  updatedAt?: string
  finishedOn?: string | null
  detail?: string
}

export interface PickStatusRequest {
  picksId: PicksId
  title: string
  year: number | null
  because: string
  status: string
  expectedCurrent: string
}

export interface PickStatusResult {
  outcome: 'written' | 'not_found' | 'conflict' | 'ambiguous' | 'error'
  currentValue?: string
}
