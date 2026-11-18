export type SortKey = 'title' | 'year' | 'rating' | 'myRating' | 'imdbRating' | 'finished' | 'status'
export type GroupKey = 'none' | 'status' | 'genre' | 'year' | 'franchise' | 'creator' | 'platform'
export type RatingBy = 'best' | 'my' | 'external'

export interface ListQuery {
  view: 'shelves' | 'grid' | 'table'
  sort: SortKey
  dir: 'asc' | 'desc'
  group: GroupKey
  q: string
  statuses: string[]
  genres: string[]
  yearMin: number | null
  yearMax: number | null
  franchise: string | null
  creator: string | null
  platform: string | null
  ratingMin: number | null
  ratingBy: RatingBy
  smart: string | null
  poster: 'any' | 'has' | 'missing'
  unrated: boolean
}

export const DEFAULT_QUERY: ListQuery = {
  view: 'grid',
  sort: 'title',
  dir: 'asc',
  group: 'none',
  q: '',
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
  unrated: false,
}

export const CLEARED_FILTERS: Pick<ListQuery, 'q' | 'statuses' | 'genres' | 'yearMin' | 'yearMax' | 'franchise' | 'creator' | 'platform' | 'ratingMin' | 'ratingBy' | 'smart' | 'poster' | 'unrated'> = {
  q: '',
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
  unrated: false,
}

export function hasActiveFilters(query: ListQuery): boolean {
  return query.q.length > 0
    || query.statuses.length > 0
    || query.genres.length > 0
    || query.yearMin !== null
    || query.yearMax !== null
    || (query.franchise !== null && query.franchise.length > 0)
    || (query.creator !== null && query.creator.length > 0)
    || (query.platform !== null && query.platform.length > 0)
    || query.ratingMin !== null
    || query.ratingBy !== DEFAULT_QUERY.ratingBy
    || (query.smart !== null && query.smart.length > 0)
    || query.poster !== 'any'
    || query.unrated
}

const SORTS: readonly SortKey[] = ['title', 'year', 'rating', 'myRating', 'imdbRating', 'finished', 'status']
const GROUPS: readonly GroupKey[] = ['none', 'status', 'genre', 'year', 'franchise', 'creator', 'platform']

function list(value: string | null): string[] {
  if (value === null || value.length === 0) return []
  return value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
}

function numberOrNull(value: string | null): number | null {
  if (value === null || value.length === 0) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseListQuery(params: URLSearchParams): ListQuery {
  const sort = params.get('sort')
  const ratingBy = params.get('rby')
  const poster = params.get('poster')
  const view = params.get('view') === 'table' ? 'table' : params.get('view') === 'shelves' ? 'shelves' : 'grid'
  const group = params.get('group')
  return {
    view,
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : 'title',
    dir: params.get('dir') === 'desc' ? 'desc' : 'asc',
    group: GROUPS.includes(group as GroupKey) ? (group as GroupKey) : view === 'shelves' ? 'status' : 'none',
    q: params.get('q') ?? '',
    statuses: list(params.get('status')),
    genres: list(params.get('genre')),
    yearMin: numberOrNull(params.get('ymin')),
    yearMax: numberOrNull(params.get('ymax')),
    franchise: params.get('franchise'),
    creator: params.get('creator'),
    platform: params.get('platform'),
    ratingMin: numberOrNull(params.get('rmin')),
    ratingBy: ratingBy === 'my' || ratingBy === 'external' ? ratingBy : 'best',
    smart: params.get('smart'),
    poster: poster === 'has' || poster === 'missing' ? poster : 'any',
    unrated: params.get('unrated') === '1',
  }
}

export function serializeListQuery(query: ListQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.view !== DEFAULT_QUERY.view) params.set('view', query.view)
  if (query.sort !== DEFAULT_QUERY.sort) params.set('sort', query.sort)
  if (query.dir !== DEFAULT_QUERY.dir) params.set('dir', query.dir)
  const impliedGroup = query.view === 'shelves' ? 'status' : 'none'
  if (query.group !== impliedGroup) params.set('group', query.group)
  if (query.q.length > 0) params.set('q', query.q)
  if (query.statuses.length > 0) params.set('status', query.statuses.join(','))
  if (query.genres.length > 0) params.set('genre', query.genres.join(','))
  if (query.yearMin !== null) params.set('ymin', String(query.yearMin))
  if (query.yearMax !== null) params.set('ymax', String(query.yearMax))
  if (query.franchise !== null && query.franchise.length > 0) params.set('franchise', query.franchise)
  if (query.creator !== null && query.creator.length > 0) params.set('creator', query.creator)
  if (query.platform !== null && query.platform.length > 0) params.set('platform', query.platform)
  if (query.ratingMin !== null) params.set('rmin', String(query.ratingMin))
  if (query.ratingBy !== DEFAULT_QUERY.ratingBy) params.set('rby', query.ratingBy)
  if (query.smart !== null && query.smart.length > 0) params.set('smart', query.smart)
  if (query.poster !== 'any') params.set('poster', query.poster)
  if (query.unrated) params.set('unrated', '1')
  return params
}
