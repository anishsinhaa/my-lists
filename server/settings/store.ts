import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PICKS_IDS, type PicksId } from '../../src/types/lists.js'
import type { LastRun, PicksToggles } from '../../src/types/settings.js'

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
