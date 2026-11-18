import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PICKS_IDS, type PicksId } from '../../src/types/lists.js'
import type { LastRun, PicksToggles } from '../../src/types/settings.js'
import { readSheetSettings, writeSheetSettings } from './sheetStore.js'

export interface SettingsFile {
  picks: PicksToggles
  lastRun: LastRun | null
}

const DEFAULTS: SettingsFile = {
  picks: { enabled: true, movies: true, series: true, games: true },
  lastRun: null,
}

let filePath = resolve(process.cwd(), 'data', 'settings.json')

export function setSettingsPath(next: string): void {
  filePath = next
}

export function defaultSettings(): SettingsFile {
  return { picks: { ...DEFAULTS.picks }, lastRun: null }
}

function isToggle(value: unknown): value is PicksToggles {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.enabled === 'boolean' && typeof row.movies === 'boolean' && typeof row.series === 'boolean' && typeof row.games === 'boolean'
}

export function readSettings(): SettingsFile {
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null || !isToggle((parsed as { picks?: unknown }).picks)) return defaultSettings()
    const row = parsed as { picks: PicksToggles; lastRun?: LastRun | null }
    return { picks: row.picks, lastRun: row.lastRun ?? null }
  } catch {
    return defaultSettings()
  }
}

export function writeSettings(next: SettingsFile): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(next, null, 2))
}

function isLastRun(value: unknown): value is LastRun {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Partial<LastRun>
  return typeof row.startedAt === 'string' && typeof row.finishedAt === 'string' && (row.mode === 'fill' || row.mode === 'force') && typeof row.tab === 'string' && typeof row.ok === 'boolean' && typeof row.summary === 'string' && typeof row.failed === 'number' && Array.isArray(row.lines)
}

export function settingsFromRows(values: unknown[][]): SettingsFile {
  const picksCell = values[0]?.[1]
  const lastCell = values[1]?.[1]
  let picks = { ...DEFAULTS.picks }
  if (typeof picksCell === 'string' && picksCell.length > 0) {
    try {
      const parsed: unknown = JSON.parse(picksCell)
      if (isToggle(parsed)) picks = parsed
    } catch {
      picks = { ...DEFAULTS.picks }
    }
  }
  let lastRun: LastRun | null = null
  if (typeof lastCell === 'string' && lastCell.length > 0) {
    try {
      const parsed: unknown = JSON.parse(lastCell)
      if (isLastRun(parsed)) lastRun = parsed
    } catch {
      lastRun = null
    }
  }
  return { picks, lastRun }
}

function onVercel(): boolean {
  return process.env.VERCEL === '1'
}

let memory: { at: number; data: SettingsFile } | undefined

export function peekSettings(): SettingsFile {
  if (!onVercel()) return readSettings()
  return memory?.data ?? defaultSettings()
}

export async function loadSettings(): Promise<SettingsFile> {
  if (!onVercel()) return readSettings()
  if (memory !== undefined && Date.now() - memory.at < 15_000) return memory.data
  try {
    const data = await readSheetSettings()
    memory = { at: Date.now(), data }
    return data
  } catch {
    return memory?.data ?? defaultSettings()
  }
}

export async function saveSettings(next: SettingsFile): Promise<void> {
  if (!onVercel()) {
    writeSettings(next)
    return
  }
  await writeSheetSettings(next)
  memory = { at: Date.now(), data: { picks: { ...next.picks }, lastRun: next.lastRun } }
}

export function effectivePicks(picks: PicksToggles, hardOff: boolean): Pick<PicksToggles, 'movies' | 'series' | 'games'> {
  if (hardOff || !picks.enabled) return { movies: false, series: false, games: false }
  return { movies: picks.movies, series: picks.series, games: picks.games }
}

export function skippedPicks(picks: PicksToggles, hardOff: boolean): PicksId[] {
  const effective = effectivePicks(picks, hardOff)
  return PICKS_IDS.filter((id) => {
    if (id === 'movies-picks') return !effective.movies
    if (id === 'series-picks') return !effective.series
    return !effective.games
  })
}
