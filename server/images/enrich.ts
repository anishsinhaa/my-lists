import { z } from 'zod'
import pLimit from 'p-limit'
import { normalizeTitle } from '../../src/lib/normalize.js'
import { sanitizePosterUrl } from '../../src/lib/normalize.js'
import { PICKS_IDS, POSTER_LISTS, TAB_NAME, type TabId } from '../../src/types/lists.js'
import type { EnrichField } from '../../src/types/media.js'
import type { PosterFillItem, PosterFillResult } from '../../src/types/api.js'
import type { SheetsClient } from '../sheets/client.js'
import { buildColumnMap, MAIN_ALIASES, PICKS_ALIASES } from '../sheets/headers.js'
import { writeCells, type CellWrite } from '../sheets/writeCells.js'
import { WRITE_POLICY } from '../sheets/writeGuard.js'
import { providerFor } from './resolve.js'

const schema = z.object({
  items: z.array(z.object({
    tab: z.string(),
    title: z.string().min(1),
    year: z.number().nullable(),
    because: z.string().optional(),
    needs: z.array(z.enum(['poster', 'creator', 'franchise', 'imdbRating'])).min(1),
  })).max(8),
})

const allowedTabs = new Set<string>([...POSTER_LISTS, ...PICKS_IDS])

export function parseFillItems(body: unknown): PosterFillItem[] {
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new Error('Invalid enrichment request')
  return parsed.data.items.flatMap((item) => {
    if (!allowedTabs.has(item.tab)) return []
    const tab = item.tab as TabId
    if (item.needs.some((field) => !WRITE_POLICY[tab].includes(field))) return []
    return [{ tab, title: item.title, year: item.year, because: item.because, needs: item.needs }]
  })
}

function emptyCell(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim().length === 0
}

export async function enrichItems(client: SheetsClient, items: PosterFillItem[], deadline = Date.now() + 25_000): Promise<PosterFillResult[]> {
  const valid = items.filter((item) => allowedTabs.has(item.tab) && item.needs.every((field) => WRITE_POLICY[item.tab].includes(field)))
  const rejected = items.filter((item) => !valid.includes(item)).map((item): PosterFillResult => ({
    tab: item.tab, titleKey: normalizeTitle(item.title), poster: null, creator: null, franchise: null, imdbRating: null, written: {}, missed: [], outcome: 'write_skipped', detail: WRITE_POLICY[item.tab].length === 0 ? 'skipped_policy' : 'invalid',
  }))
  const tabs = [...new Set(valid.map((item) => item.tab))]
  const batches = tabs.length === 0 ? [] : await client.batchGetValues(tabs.map((tab) => `'${TAB_NAME[tab]}'!A1:Z3000`))
  const values = new Map(tabs.map((tab, index) => [tab, batches[index]?.values ?? []]))
  const limiters = new Map<string, ReturnType<typeof pLimit>>()
  const writes: CellWrite[] = []
  const prepared: Array<{ item: PosterFillItem; titleKey: string; stillEmpty: EnrichField[]; match: { poster?: string; creator?: string; franchise?: string; imdbRating?: number } | null; outcome: PosterFillResult['outcome']; detail?: string }> = []

  await Promise.all(valid.map(async (item) => {
    if (Date.now() > deadline) {
      prepared.push({ item, titleKey: normalizeTitle(item.title), stillEmpty: item.needs, match: null, outcome: 'provider_error', detail: 'timeout' })
      return
    }
    const rows = values.get(item.tab) ?? []
    const picks = (PICKS_IDS as readonly string[]).includes(item.tab)
    const map = picks ? buildColumnMap(rows[0] ?? [], PICKS_ALIASES) : buildColumnMap(rows[0] ?? [], MAIN_ALIASES)
    const titleKey = normalizeTitle(item.title)
    const matches = rows.slice(1).filter((row) => normalizeTitle(String(row[map.index.title ?? -1] ?? '')) === titleKey)
    const narrowed = item.year === null ? matches : matches.filter((row) => String(row[map.index.year ?? -1] ?? '').includes(String(item.year)))
    if (narrowed.length === 0) {
      prepared.push({ item, titleKey, stillEmpty: [], match: null, outcome: 'not_found' })
      return
    }
    if (narrowed.length > 1) {
      prepared.push({ item, titleKey, stillEmpty: [], match: null, outcome: 'write_skipped', detail: 'skipped_ambiguous' })
      return
    }
    const row = narrowed[0] ?? []
    const stillEmpty = item.needs.filter((field) => map.index[field as 'poster'] !== undefined && emptyCell(row[map.index[field as 'poster'] ?? -1]))
    if (stillEmpty.length === 0) {
      prepared.push({ item, titleKey, stillEmpty, match: null, outcome: 'already_filled' })
      return
    }
    const provider = providerFor(item.tab)
    if (provider === null) {
      prepared.push({ item, titleKey, stillEmpty, match: null, outcome: 'write_skipped', detail: 'skipped_policy' })
      return
    }
    const limiter = limiters.get(provider.id) ?? pLimit(1)
    limiters.set(provider.id, limiter)
    try {
      const match = await limiter(() => provider.lookup({ title: item.title, year: item.year, need: stillEmpty }))
      prepared.push({ item, titleKey, stillEmpty, match, outcome: match === null ? 'not_found' : 'ok' })
    } catch {
      prepared.push({ item, titleKey, stillEmpty, match: null, outcome: 'provider_error' })
    }
  }))

  for (const entry of prepared) {
    if (entry.match === null) continue
    for (const field of entry.stillEmpty) {
      const raw = entry.match[field]
      if (raw === undefined) continue
      const value = field === 'poster' ? sanitizePosterUrl(raw) : field === 'imdbRating' ? (typeof raw === 'number' ? raw : null) : String(raw)
      if (value === null || value === '') continue
      writes.push({ tab: entry.item.tab, field, titleKey: entry.titleKey, year: entry.item.year, becauseKey: entry.item.because === undefined ? undefined : normalizeTitle(entry.item.because), value, expectedCurrent: '' })
    }
  }
  const written = writes.length === 0 ? [] : await writeCells(client, writes)
  return [...rejected, ...prepared.map((entry) => {
    const mine = written.filter((result) => result.write.titleKey === entry.titleKey && result.write.tab === entry.item.tab)
    const flags = Object.fromEntries(entry.stillEmpty.map((field) => [field, mine.some((result) => result.write.field === field && result.outcome === 'written')])) as PosterFillResult['written']
    const missed = entry.stillEmpty.filter((field) => entry.match?.[field] === undefined && flags[field] !== true)
    const wroteAny = Object.values(flags).some(Boolean)
    const outcome: PosterFillResult['outcome'] = entry.outcome === 'ok'
      ? (entry.stillEmpty.every((field) => flags[field] === true) ? 'ok' : wroteAny ? 'partial' : 'not_found')
      : entry.outcome
    return {
      tab: entry.item.tab,
      titleKey: entry.titleKey,
      becauseKey: entry.item.because === undefined ? undefined : normalizeTitle(entry.item.because),
      poster: flags.poster === true ? entry.match?.poster ?? null : null,
      creator: flags.creator === true ? entry.match?.creator ?? null : null,
      franchise: flags.franchise === true ? entry.match?.franchise ?? null : null,
      imdbRating: flags.imdbRating === true ? entry.match?.imdbRating ?? null : null,
      written: flags,
      missed,
      outcome,
      detail: entry.detail,
    }
  })]
}
