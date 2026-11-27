import { matchStatus, STATUS_TABLE, type StatusDef } from '@/design/statusConfig'
import { readJson, writeJson } from '@/lib/storage'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'

export const TONIGHT_KEY = 'ml.tonight.v1'
export const SHORT_MINUTES = 100

const PICK_LISTS: readonly ListId[] = ['movies', 'series', 'anime', 'games', 'books']

export type TonightCategory = (typeof PICK_LISTS)[number] | 'any'

export interface TonightChoice {
  category: TonightCategory
  statuses: string[]
  genres: string[]
  short: boolean
}

const PICK_SET = new Set<string>(PICK_LISTS)

export function isTonightCategory(value: unknown): value is TonightCategory {
  return value === 'any' || (typeof value === 'string' && PICK_SET.has(value))
}

export function defaultStatuses(category: TonightCategory): string[] {
  if (category === 'movies') return ['Must watch', 'Want to']
  if (category === 'books') return ['Want to buy', 'Bought']
  if (category === 'any') return ['Must watch', 'Want to', 'Want to buy', 'Bought']
  return ['Want to']
}

export function statusChoices(category: TonightCategory, _lists: Record<ListId, MediaItem[]>): StatusDef[] {
  if (category === 'any') return uniqueStatuses([...STATUS_TABLE.movies, ...STATUS_TABLE.series, ...STATUS_TABLE.games, ...STATUS_TABLE.books])
  return [...STATUS_TABLE[category]]
}

function uniqueStatuses(rows: StatusDef[]): StatusDef[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = row.value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function categoryItems(lists: Record<ListId, MediaItem[]>, category: TonightCategory): MediaItem[] {
  if (category === 'any') return PICK_LISTS.flatMap((id) => lists[id])
  return lists[category]
}

export function topGenres(items: MediaItem[], limit = 6): string[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const genre of item.genres) {
      const name = genre.trim()
      if (name.length === 0) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, limit).map(([name]) => name)
}

export function runtimeMinutes(item: MediaItem): number | null {
  for (const [key, raw] of Object.entries(item.extra)) {
    if (!/runtime|duration|length|minutes/.test(key.toLowerCase())) continue
    const parsed = parseRuntime(raw)
    if (parsed !== null) return parsed
  }
  return null
}

function parseRuntime(raw: string): number | null {
  const text = raw.trim().toLowerCase()
  if (text.length === 0) return null
  const hours = /(\d+)\s*h(?:\s*(\d+)\s*m)?/.exec(text)
  if (hours !== null) return Number(hours[1]) * 60 + Number(hours[2] ?? 0)
  const minutes = /(\d+)\s*m/.exec(text)
  if (minutes !== null) return Number(minutes[1])
  if (/^\d+(\.\d+)?$/.test(text)) {
    const value = Number(text)
    if (value > 0 && value < 1000) return Math.round(value)
  }
  return null
}

export function categoryHasRuntime(items: MediaItem[]): boolean {
  return items.some((item) => runtimeMinutes(item) !== null)
}

export function tonightMatches(lists: Record<ListId, MediaItem[]>, choice: TonightChoice): MediaItem[] {
  return categoryItems(lists, choice.category).filter((item) => {
    if (choice.statuses.length > 0) {
      const status = matchStatus(item.listId, item.status).value.toLowerCase()
      if (!choice.statuses.some((wanted) => wanted.toLowerCase() === status)) return false
    }
    if (choice.genres.length > 0 && !item.genres.some((genre) => choice.genres.includes(genre))) return false
    if (choice.short) {
      const minutes = runtimeMinutes(item)
      if (minutes === null || minutes > SHORT_MINUTES) return false
    }
    return true
  })
}

export function choosePick(matches: MediaItem[], previousId: string | null, random: () => number = Math.random): MediaItem | null {
  if (matches.length === 0) return null
  const pool = previousId !== null && matches.length > 1 ? matches.filter((item) => item.id !== previousId) : matches
  const usable = pool.length === 0 ? matches : pool
  return usable[Math.floor(random() * usable.length)] ?? null
}

export function spinFrames(matches: MediaItem[], winner: MediaItem, count = 8, random: () => number = Math.random): MediaItem[] {
  const frames: MediaItem[] = []
  const spins = Math.max(2, count)
  for (let index = 0; index < spins - 1; index += 1) frames.push(matches[Math.floor(random() * matches.length)] ?? winner)
  frames.push(winner)
  return frames
}

export function itemHref(item: MediaItem): string {
  return `/lists/${item.listId}?item=${encodeURIComponent(item.id)}`
}

function sanitizeStatuses(category: TonightCategory, value: unknown, lists: Record<ListId, MediaItem[]>): string[] {
  if (!Array.isArray(value)) return defaultStatuses(category)
  const allowed = new Set(statusChoices(category, lists).map((row) => row.value.toLowerCase()))
  const next = value.filter((entry): entry is string => typeof entry === 'string' && (allowed.size === 0 || allowed.has(entry.toLowerCase())))
  if (value.length === 0) return []
  return next.length === 0 ? defaultStatuses(category) : next
}

export function readTonight(lists: Record<ListId, MediaItem[]>, preset?: TonightCategory): TonightChoice {
  const saved = readJson<Partial<TonightChoice>>(TONIGHT_KEY, {})
  const stored: TonightCategory = saved.category === 'other' || saved.category === 'curious'
    ? 'any'
    : isTonightCategory(saved.category) ? saved.category : 'movies'
  const category = preset ?? stored
  const statuses = preset === undefined || preset === stored ? sanitizeStatuses(category, saved.statuses, lists) : defaultStatuses(category)
  return { category, statuses, genres: [], short: false }
}

export function rememberTonight(choice: Pick<TonightChoice, 'category' | 'statuses'>): void {
  writeJson(TONIGHT_KEY, { category: choice.category, statuses: choice.statuses })
}
