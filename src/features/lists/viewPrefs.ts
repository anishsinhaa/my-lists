import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { SMART_VIEWS } from './smart/smartViews'
import { DEFAULT_QUERY, parseListQuery, type GroupKey, type ListQuery, type RatingBy, type SortKey } from './filters/listQuery'

const VIEWS = ['shelves', 'grid', 'table'] as const
const SORTS: readonly SortKey[] = ['title', 'year', 'rating', 'myRating', 'imdbRating', 'finished', 'status']
const GROUPS: readonly GroupKey[] = ['none', 'status', 'genre', 'year', 'franchise', 'creator', 'platform']
const RATING_BY: readonly RatingBy[] = ['best', 'my', 'external']
const POSTERS = ['any', 'has', 'missing'] as const

export interface FilterCatalog {
  genres: ReadonlySet<string>
  creators: ReadonlySet<string>
  franchises: ReadonlySet<string>
  platforms: ReadonlySet<string>
  statuses: ReadonlySet<string>
}

export function prefsKey(listId: string): string {
  return `ml.viewPrefs.v1.${listId}`
}

export function catalogFrom(items: MediaItem[]): FilterCatalog {
  const genres = new Set<string>()
  const creators = new Set<string>()
  const franchises = new Set<string>()
  const platforms = new Set<string>()
  const statuses = new Set<string>()
  for (const item of items) {
    for (const genre of item.genres) genres.add(genre)
    if (item.creator !== null && item.creator.length > 0) creators.add(item.creator)
    if (item.franchise !== null && item.franchise.length > 0) franchises.add(item.franchise)
    if (item.platform !== null && item.platform.length > 0) platforms.add(item.platform)
    if (item.status.length > 0) statuses.add(item.status)
  }
  return { genres, creators, franchises, platforms, statuses }
}

export function filterBadgeCount(query: ListQuery): number {
  let count = query.statuses.length + query.genres.length
  if (query.yearMin !== null || query.yearMax !== null) count += 1
  if (query.creator !== null && query.creator.length > 0) count += 1
  if (query.franchise !== null && query.franchise.length > 0) count += 1
  if (query.platform !== null && query.platform.length > 0) count += 1
  if (query.ratingMin !== null) count += 1
  if (query.ratingBy !== DEFAULT_QUERY.ratingBy) count += 1
  if (query.smart !== null && query.smart.length > 0) count += 1
  if (query.poster !== 'any') count += 1
  return count
}

export function viewIsCustom(query: ListQuery): boolean {
  return query.view !== DEFAULT_QUERY.view
    || query.sort !== DEFAULT_QUERY.sort
    || query.dir !== DEFAULT_QUERY.dir
    || query.group !== DEFAULT_QUERY.group
    || query.unrated
    || query.favWant
    || query.favWatched
}

export function clearFiltersPatch(): Pick<ListQuery, 'statuses' | 'genres' | 'yearMin' | 'yearMax' | 'franchise' | 'creator' | 'platform' | 'ratingMin' | 'ratingBy' | 'smart' | 'poster'> {
  return {
    statuses: [],
    genres: [],
    yearMin: null,
    yearMax: null,
    franchise: null,
    creator: null,
    platform: null,
    ratingMin: null,
    ratingBy: 'best',
    smart: null,
    poster: 'any',
  }
}

export function resetViewPatch(): Pick<ListQuery, 'view' | 'sort' | 'dir' | 'group' | 'unrated' | 'favWant' | 'favWatched'> {
  return {
    view: DEFAULT_QUERY.view,
    sort: DEFAULT_QUERY.sort,
    dir: DEFAULT_QUERY.dir,
    group: DEFAULT_QUERY.group,
    unrated: false,
    favWant: false,
    favWatched: false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const next: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (trimmed.length === 0 || seen.has(trimmed)) continue
    seen.add(trimmed)
    next.push(trimmed)
  }
  return next
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function firstKnown(values: string[], allowed: ReadonlySet<string> | null): string | null {
  const picked = allowed === null ? values[0] : values.find((value) => allowed.has(value))
  return picked === undefined ? null : picked
}

export function parseStored(value: unknown, listId: ListId, catalog: FilterCatalog | null = null): ListQuery {
  if (!isRecord(value)) return { ...DEFAULT_QUERY }
  const toggles = isRecord(value.toggles) ? value.toggles : {}
  const filters = isRecord(value.filters) ? value.filters : {}
  const smartIds = SMART_VIEWS[listId].map((view) => view.id)
  const smart = typeof filters.smart === 'string' && smartIds.includes(filters.smart) ? filters.smart : null
  return {
    view: oneOf(value.view, VIEWS, 'grid'),
    sort: oneOf(value.sortBy, SORTS, 'title'),
    dir: value.sortDir === 'desc' ? 'desc' : 'asc',
    group: oneOf(value.groupBy, GROUPS, 'none'),
    q: '',
    statuses: strings(filters.status).filter((status) => catalog === null || catalog.statuses.has(status)),
    genres: strings(filters.genre).filter((genre) => catalog === null || catalog.genres.has(genre)),
    yearMin: finite(filters.yearMin),
    yearMax: finite(filters.yearMax),
    creator: firstKnown(strings(filters.creator), catalog === null ? null : catalog.creators),
    franchise: firstKnown(strings(filters.franchise), catalog === null ? null : catalog.franchises),
    platform: firstKnown(strings(filters.platform), catalog === null ? null : catalog.platforms),
    ratingMin: finite(filters.ratingMin),
    ratingBy: oneOf(filters.ratingBy, RATING_BY, 'best'),
    smart,
    poster: oneOf(filters.poster, POSTERS, 'any'),
    unrated: toggles.unrated === true,
    favWant: toggles.favWantTo === true,
    favWatched: toggles.favWatched === true,
  }
}

export function queryToStored(query: ListQuery): unknown {
  return {
    view: query.view,
    sortBy: query.sort,
    sortDir: query.dir,
    groupBy: query.group,
    toggles: {
      unrated: query.unrated,
      favWantTo: query.favWant,
      favWatched: query.favWatched,
    },
    filters: {
      genre: query.genres,
      yearMin: query.yearMin,
      yearMax: query.yearMax,
      creator: query.creator === null || query.creator.length === 0 ? [] : [query.creator],
      franchise: query.franchise === null || query.franchise.length === 0 ? [] : [query.franchise],
      platform: query.platform === null || query.platform.length === 0 ? [] : [query.platform],
      ratingMin: query.ratingMin,
      ratingBy: query.ratingBy,
      status: query.statuses,
      smart: query.smart,
      poster: query.poster,
    },
  }
}

export function pruneQuery(query: ListQuery, catalog: FilterCatalog): ListQuery {
  return {
    ...query,
    genres: query.genres.filter((genre) => catalog.genres.has(genre)),
    statuses: query.statuses.filter((status) => catalog.statuses.has(status)),
    creator: query.creator !== null && catalog.creators.has(query.creator) ? query.creator : null,
    franchise: query.franchise !== null && catalog.franchises.has(query.franchise) ? query.franchise : null,
    platform: query.platform !== null && catalog.platforms.has(query.platform) ? query.platform : null,
  }
}

export function sameQuery(left: ListQuery, right: ListQuery): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function applyUrl(base: ListQuery, params: URLSearchParams): ListQuery {
  const parsed = parseListQuery(params)
  const next = { ...base, q: parsed.q }
  if (params.has('view')) {
    next.view = parsed.view
    if (!params.has('group') && parsed.view === 'shelves') next.group = 'status'
  }
  if (params.has('sort')) next.sort = parsed.sort
  if (params.has('dir')) next.dir = parsed.dir
  if (params.has('group')) next.group = parsed.group
  if (params.has('status')) next.statuses = parsed.statuses
  if (params.has('genre')) next.genres = parsed.genres
  if (params.has('ymin')) next.yearMin = parsed.yearMin
  if (params.has('ymax')) next.yearMax = parsed.yearMax
  if (params.has('franchise')) next.franchise = parsed.franchise
  if (params.has('creator')) next.creator = parsed.creator
  if (params.has('platform')) next.platform = parsed.platform
  if (params.has('rmin')) next.ratingMin = parsed.ratingMin
  if (params.has('rby')) next.ratingBy = parsed.ratingBy
  if (params.has('smart')) next.smart = parsed.smart
  if (params.has('poster')) next.poster = parsed.poster
  if (params.has('unrated')) next.unrated = parsed.unrated
  if (params.has('favwant')) next.favWant = parsed.favWant
  if (params.has('favwatched')) next.favWatched = parsed.favWatched
  return next
}

export function readStoredQuery(listId: ListId, raw: string | null, catalog: FilterCatalog | null = null): ListQuery {
  if (raw === null) {
    const legacy = legacyView(listId)
    return legacy
  }
  try {
    return parseStored(JSON.parse(raw) as unknown, listId, catalog)
  } catch {
    return { ...DEFAULT_QUERY }
  }
}

function legacyView(listId: ListId): ListQuery {
  try {
    const legacy = localStorage.getItem(`ml.view.${listId}`)
    if (legacy === 'shelves' || legacy === 'grid' || legacy === 'table') {
      return { ...DEFAULT_QUERY, view: legacy, group: legacy === 'shelves' ? 'status' : 'none' }
    }
  } catch {
    return { ...DEFAULT_QUERY }
  }
  return { ...DEFAULT_QUERY }
}
