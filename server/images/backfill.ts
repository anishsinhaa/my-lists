import { parseYear } from '../../src/lib/dates.js'
import { normalizeTitle, sanitizePosterUrl } from '../../src/lib/normalize.js'
import { POSTER_LISTS, TAB_NAME, type ListId } from '../../src/types/lists.js'
import type { EnrichReportLine } from '../../src/types/settings.js'
import type { SheetsClient } from '../sheets/client.js'
import { buildColumnMap, MAIN_ALIASES, type MainField } from '../sheets/headers.js'
import { writeCells, type CellWrite } from '../sheets/writeCells.js'
import { omdbKey } from './http.js'
import { providerFor } from './resolve.js'
import type { PosterMatch } from './types.js'

export type FailReason = 'no match' | 'API error' | 'no rating' | 'OMDB_API_KEY is empty'

export interface TabReport {
  tab: ListId
  posterFilled: number
  posterMissing: number
  imdbFilled: number
  imdbMissing: number
  failures: Array<{ title: string; reason: FailReason }>
  omdbSkipped: number
}

export interface BackfillOptions {
  tabs?: readonly ListId[]
  force?: boolean
  onProgress?: (update: { tab: ListId; done: number; total: number; failed: number }) => void
}

interface Job {
  title: string
  titleKey: string
  year: number | null
  author?: string
  poster: boolean
  rating: boolean
  posterBlank: boolean
  ratingBlank: boolean
  posterCurrent: string
  ratingCurrent: string
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim()
}

function blank(value: unknown): boolean {
  return text(value).length === 0
}

function usesOmdb(tab: ListId): boolean {
  return tab === 'movies' || tab === 'series' || tab === 'anime'
}

async function lookup(tab: ListId, title: string, year: number | null, author: string | undefined, need: Array<'poster' | 'imdbRating'>): Promise<{ match: PosterMatch | null; error: 'no match' | 'API error' | null }> {
  const provider = providerFor(tab)
  if (provider === null) return { match: null, error: 'no match' }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const match = await provider.lookup({ title, year, author, need })
      return { match, error: match === null ? 'no match' : null }
    } catch {
      if (attempt === 0) continue
      return { match: null, error: 'API error' }
    }
  }
  return { match: null, error: 'API error' }
}

export function toReportLine(report: TabReport): EnrichReportLine {
  return {
    tab: report.tab,
    posterFilled: report.posterFilled,
    posterMissing: report.posterMissing,
    imdbFilled: report.imdbFilled,
    imdbMissing: report.imdbMissing,
    failures: report.failures.slice(0, 20).map((failure) => `${failure.title}: ${failure.reason}`),
  }
}

export async function backfillAll(client: SheetsClient, log: (line: string) => void = console.log, options: BackfillOptions = {}): Promise<TabReport[]> {
  const tabs = options.tabs ?? POSTER_LISTS
  if (options.force === true && tabs.length !== 1) throw new Error('Force refetch needs exactly one tab')
  const reports: TabReport[] = []
  let failed = 0
  for (const tab of tabs) {
    const report = await backfillTab(client, tab, log, options.force === true, (done, total, tabFailed) => {
      options.onProgress?.({ tab, done, total, failed: failed + tabFailed })
    })
    failed += report.failures.length
    reports.push(report)
  }
  return reports
}

async function backfillTab(
  client: SheetsClient,
  tab: ListId,
  log: (line: string) => void,
  force: boolean,
  onProgress: (done: number, total: number, failed: number) => void,
): Promise<TabReport> {
  const report: TabReport = { tab, posterFilled: 0, posterMissing: 0, imdbFilled: 0, imdbMissing: 0, failures: [], omdbSkipped: 0 }
  const [batch] = await client.batchGetValues([`'${TAB_NAME[tab]}'!A1:Z3000`])
  const rows = batch?.values ?? []
  const map = buildColumnMap<MainField>(rows[0] ?? [], MAIN_ALIASES)
  const posterIndex = map.index.poster
  const ratingIndex = map.index.imdbRating
  const titleIndex = map.index.title
  if (titleIndex === undefined) {
    log(`${TAB_NAME[tab]}: no Title column`)
    onProgress(0, 0, 0)
    return report
  }
  const omdb = omdbKey().length > 0
  const jobs: Job[] = []
  for (const row of rows.slice(1)) {
    const title = text(row[titleIndex])
    if (title.length === 0) continue
    const posterBlank = posterIndex !== undefined && blank(row[posterIndex])
    const ratingBlank = ratingIndex !== undefined && blank(row[ratingIndex])
    const poster = posterIndex !== undefined && (force || posterBlank)
    const rating = ratingIndex !== undefined && (force || ratingBlank)
    if (!poster && !rating) continue
    const author = text(row[map.index.creator ?? -1])
    jobs.push({
      title,
      titleKey: normalizeTitle(title),
      year: parseYear(row[map.index.year ?? -1]),
      author: author.length > 0 ? author : undefined,
      poster,
      rating,
      posterBlank,
      ratingBlank,
      posterCurrent: posterIndex === undefined ? '' : text(row[posterIndex]),
      ratingCurrent: ratingIndex === undefined ? '' : text(row[ratingIndex]),
    })
  }
  log(`${TAB_NAME[tab]}: ${jobs.length} titles to fill`)
  onProgress(0, jobs.length, 0)
  const writes: CellWrite[] = []
  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index]
    if (job === undefined) continue
    if ((index + 1) % 25 === 0 || index === jobs.length - 1) log(`${TAB_NAME[tab]} ${index + 1}/${jobs.length}`)
    const ratingOnly = job.rating && !job.poster
    if (ratingOnly && usesOmdb(tab) && !omdb) {
      report.omdbSkipped += 1
      if (job.ratingBlank) report.imdbMissing += 1
      report.failures.push({ title: job.title, reason: 'OMDB_API_KEY is empty' })
      onProgress(index + 1, jobs.length, report.failures.length)
      continue
    }
    const need: Array<'poster' | 'imdbRating'> = []
    if (job.poster) need.push('poster')
    if (job.rating && (omdb || !usesOmdb(tab))) need.push('imdbRating')
    const result = need.length === 0
      ? { match: null, error: null }
      : await lookup(tab, job.title, job.year, job.author, need)
    if (result.error !== null) {
      report.failures.push({ title: job.title, reason: result.error })
      if (job.poster && job.posterBlank) report.posterMissing += 1
      if (job.rating && job.ratingBlank) report.imdbMissing += 1
      onProgress(index + 1, jobs.length, report.failures.length)
      continue
    }
    const posterUrl = job.poster ? sanitizePosterUrl(result.match?.poster) : null
    if (job.poster && posterUrl !== null) {
      writes.push({ tab, field: 'poster', titleKey: job.titleKey, year: job.year, value: posterUrl, expectedCurrent: job.posterCurrent, overwrite: job.posterCurrent.length > 0 })
    } else if (job.poster && job.posterBlank) report.posterMissing += 1
    if (job.rating && typeof result.match?.imdbRating === 'number') {
      writes.push({ tab, field: 'imdbRating', titleKey: job.titleKey, year: job.year, value: result.match.imdbRating, expectedCurrent: job.ratingCurrent, overwrite: job.ratingCurrent.length > 0 })
    } else if (job.rating && job.ratingBlank) {
      report.imdbMissing += 1
      if (usesOmdb(tab) && !omdb) report.omdbSkipped += 1
      else if (!report.failures.some((failure) => failure.title === job.title)) report.failures.push({ title: job.title, reason: 'no rating' })
    }
    onProgress(index + 1, jobs.length, report.failures.length)
  }
  if (writes.length > 0) {
    const written = await writeCells(client, writes)
    for (const result of written) {
      const kept = result.outcome === 'written' || (result.outcome === 'skipped_conflict' && result.write.overwrite !== true)
      if (!kept) {
        if (result.write.field === 'poster') report.posterMissing += 1
        if (result.write.field === 'imdbRating') report.imdbMissing += 1
        continue
      }
      if (result.write.field === 'poster') report.posterFilled += 1
      if (result.write.field === 'imdbRating') report.imdbFilled += 1
    }
  }
  onProgress(jobs.length, jobs.length, report.failures.length)
  return report
}
