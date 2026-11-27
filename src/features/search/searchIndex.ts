import { sortTitle } from '@/lib/normalize'
import { LIST_IDS, type ListId } from '@/types/lists'
import type { ListsPayload, MediaItem, PickItem } from '@/types/media'

export type SearchSource = { kind: 'item'; item: MediaItem } | { kind: 'pick'; item: PickItem }

export interface SearchHit {
  id: string
  source: SearchSource
  listId: ListId
  rank: 0 | 1 | 2 | 3 | 4
  score: number
}

interface IndexedEntry {
  source: SearchSource
  listId: ListId
  listOrder: number
  index: number
  isPick: boolean
  title: string
  words: string[]
  compact: string
  franchiseWords: string[]
  creatorWords: string[]
  year: number | null
}

export interface SearchIndex {
  entries: IndexedEntry[]
  size: number
}

const ARTICLE = /^(?:the|a|an) /

function wordsOf(value: string): string[] {
  return value.length === 0 ? [] : value.split(' ')
}

function withoutArticle(value: string): string {
  return value.replace(ARTICLE, '')
}

function isExact(title: string, query: string): boolean {
  if (title === query) return true
  const titleBare = withoutArticle(title)
  const queryBare = withoutArticle(query)
  return titleBare === query || title === queryBare || titleBare === queryBare
}

function isPrefix(title: string, query: string): boolean {
  if (title.startsWith(query)) return true
  const bare = withoutArticle(title)
  return bare.startsWith(query) || title.startsWith(withoutArticle(query))
}

function isWordStart(words: string[], queryWords: string[]): boolean {
  if (queryWords.length === 0) return false
  let from = 0
  for (const word of queryWords) {
    let found = -1
    for (let index = from; index < words.length; index += 1) {
      const current = words[index]
      if (current !== undefined && current.startsWith(word)) {
        found = index
        break
      }
    }
    if (found < 0) return false
    from = found + 1
  }
  return true
}

function matchPosition(title: string, compact: string, query: string, compactQuery: string): number {
  const spots = [title.indexOf(query), withoutArticle(title).indexOf(query), title.indexOf(withoutArticle(query))]
  const found = spots.filter((spot) => spot >= 0)
  if (found.length > 0) return Math.min(...found)
  const compactSpot = compact.indexOf(compactQuery)
  return compactSpot < 0 ? title.length : compactSpot
}

function rankOf(entry: IndexedEntry, query: string, queryWords: string[], compactQuery: string): 0 | 1 | 2 | 3 | 4 | null {
  if (isExact(entry.title, query)) return 0
  if (isPrefix(entry.title, query)) return 1
  if (isWordStart(entry.words, queryWords)) return 2
  if (query.length >= 4 && (entry.title.includes(query) || entry.compact.includes(compactQuery))) return 3
  if (query.length >= 3 && (isWordStart(entry.franchiseWords, queryWords) || isWordStart(entry.creatorWords, queryWords))) return 4
  return null
}

function compareYear(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return left - right
}

function indexEntry(source: SearchSource, index: number): IndexedEntry {
  const item = source.item
  const listId = source.kind === 'item' ? source.item.listId : source.item.targetList
  const title = sortTitle(item.title)
  const franchise = sortTitle('franchise' in item && item.franchise !== null ? item.franchise : '')
  const creator = sortTitle('creator' in item && item.creator !== null ? item.creator : '')
  return {
    source,
    listId,
    listOrder: Math.max(0, LIST_IDS.indexOf(listId)),
    index,
    isPick: source.kind === 'pick',
    title,
    words: wordsOf(title),
    compact: title.replaceAll(' ', ''),
    franchiseWords: wordsOf(franchise),
    creatorWords: wordsOf(creator),
    year: item.year,
  }
}

export function buildSearchIndex(payload: ListsPayload): SearchIndex {
  const sources: SearchSource[] = [
    ...LIST_IDS.flatMap((id) => payload.lists[id].map((item) => ({ kind: 'item' as const, item }))),
    ...(['movies-picks', 'series-picks', 'games-picks'] as const).flatMap((id) => payload.picks[id].map((item) => ({ kind: 'pick' as const, item }))),
  ]
  return { entries: sources.map((source, index) => indexEntry(source, index)), size: sources.length }
}

export function searchIndex(index: SearchIndex, query: string, limit = 20): SearchHit[] {
  const text = sortTitle(query.trim())
  if (text.length < 2) return []
  const queryWords = wordsOf(text)
  const compactQuery = text.replaceAll(' ', '')
  const ranked = index.entries.flatMap((entry) => {
    const rank = rankOf(entry, text, queryWords, compactQuery)
    if (rank === null) return []
    return [{ entry, rank, position: matchPosition(entry.title, entry.compact, text, compactQuery) }]
  })
  ranked.sort((left, right) => {
    if (left.rank !== right.rank) return left.rank - right.rank
    if (left.entry.title.length !== right.entry.title.length) return left.entry.title.length - right.entry.title.length
    if (left.position !== right.position) return left.position - right.position
    if (left.entry.listOrder !== right.entry.listOrder) return left.entry.listOrder - right.entry.listOrder
    const titled = left.entry.title.localeCompare(right.entry.title, 'en', { numeric: true, sensitivity: 'base' })
    if (titled !== 0) return titled
    const year = compareYear(left.entry.year, right.entry.year)
    if (year !== 0) return year
    if (left.entry.isPick !== right.entry.isPick) return left.entry.isPick ? 1 : -1
    return left.entry.index - right.entry.index
  })
  return ranked.slice(0, limit).map((row) => ({
    id: row.entry.source.item.id,
    source: row.entry.source,
    listId: row.entry.listId,
    rank: row.rank,
    score: row.rank,
  }))
}

export function groupHits(hits: SearchHit[]): Array<{ listId: ListId; hits: SearchHit[] }> {
  const groups: Array<{ listId: ListId; hits: SearchHit[] }> = []
  const index = new Map<ListId, number>()
  for (const hit of hits) {
    const existing = index.get(hit.listId)
    if (existing === undefined) {
      index.set(hit.listId, groups.length)
      groups.push({ listId: hit.listId, hits: [hit] })
    } else {
      const group = groups[existing]
      if (group !== undefined) group.hits.push(hit)
    }
  }
  return groups
}

export function visibleGroupHits(hits: SearchHit[], expanded: ReadonlySet<string>, perGroup = 8): SearchHit[] {
  return groupHits(hits).flatMap((group) => (
    expanded.has(group.listId) || group.hits.length <= perGroup ? group.hits : group.hits.slice(0, perGroup)
  ))
}
