import type { ListId } from '../../src/types/lists.js'
import type { EnrichProgress, EnrichReportLine, LastRun } from '../../src/types/settings.js'
import { readSettings, writeSettings } from './store.js'

export interface EnrichRequest {
  mode: 'fill' | 'force'
  target: string
  run: (onProgress: (update: { tab: ListId; done: number; total: number; failed: number }) => void) => Promise<EnrichReportLine[]>
}

const idle = (): EnrichProgress => ({
  running: false,
  tab: null,
  done: 0,
  total: 0,
  failed: 0,
  startedAt: null,
  finishedAt: null,
  error: null,
  mode: null,
  target: null,
  lines: [],
  lastRun: null,
})

let current: EnrichProgress = idle()

export function resetEnrichJob(): void {
  current = idle()
}

export function enrichStatus(): EnrichProgress {
  return { ...current, lines: current.lines.map((line) => ({ ...line, failures: [...line.failures] })), lastRun: readSettings().lastRun }
}

export function startEnrichJob(request: EnrichRequest): boolean {
  if (current.running) return false
  const startedAt = new Date().toISOString()
  current = { ...idle(), running: true, startedAt, mode: request.mode, target: request.target, lastRun: readSettings().lastRun }
  void request.run((update) => {
    if (!current.running) return
    current = { ...current, tab: update.tab, done: update.done, total: update.total, failed: update.failed }
  }).then((lines) => {
    const finishedAt = new Date().toISOString()
    const failed = lines.reduce((sum, line) => sum + line.failures.length, 0)
    const lastRun = remember(startedAt, finishedAt, request, true, failed, lines, null)
    current = { ...current, running: false, finishedAt, failed, error: null, lines, lastRun }
  }).catch((error: unknown) => {
    const finishedAt = new Date().toISOString()
    const message = error instanceof Error ? error.message : 'Refresh failed'
    const lastRun = remember(startedAt, finishedAt, request, false, current.failed, current.lines, message)
    current = { ...current, running: false, finishedAt, error: message, lastRun }
  })
  return true
}

function remember(startedAt: string, finishedAt: string, request: EnrichRequest, ok: boolean, failed: number, lines: EnrichReportLine[], error: string | null): LastRun {
  const summary = error !== null
    ? error
    : lines.map((line) => `${line.tab}: posters ${line.posterFilled} filled, ${line.posterMissing} missing; ratings ${line.imdbFilled} filled, ${line.imdbMissing} missing`).join('; ')
  const lastRun: LastRun = { startedAt, finishedAt, mode: request.mode, tab: request.target, ok, summary: summary.length === 0 ? 'Nothing to fill' : summary, failed, lines }
  const stored = readSettings()
  try {
    writeSettings({ picks: stored.picks, lastRun })
  } catch {
    // The page still gets the result from the in-memory job.
  }
  return lastRun
}
