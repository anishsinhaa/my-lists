import type { ListId, PicksId, StatusGroup, TabId } from './lists.ts'

export interface MediaItem {
  id: string
  listId: ListId
  title: string
  titleKey: string
  status: string
  statusGroup: StatusGroup
  year: number | null
  genres: string[]
  why: string
  notes: string
  updatedAt: string | null
  poster: string | null
  creator: string | null
  franchise: string | null
  myRating: number | null
  imdbRating: number | null
  platform: string | null
  favourite: boolean
  extra: Record<string, string>
}

export interface PickItem {
  id: string
  picksId: PicksId
  targetList: ListId
  title: string
  titleKey: string
  becauseYouLiked: string
  becauseKey: string
  year: number | null
  genres: string[]
  status: string
  why: string
  poster: string | null
}

export type EnrichField = 'poster' | 'creator' | 'franchise' | 'imdbRating'

export interface SheetWarning {
  tab: TabId
  code: 'missing_tab' | 'missing_title_column' | 'missing_header' | 'duplicate_title' | 'bad_value'
  message: string
}

export interface ListsPayload {
  fetchedAt: string
  dataHash: string
  lists: Record<ListId, MediaItem[]>
  picks: Record<PicksId, PickItem[]>
  warnings: SheetWarning[]
  columns: Record<TabId, Record<EnrichField, boolean>>
}
