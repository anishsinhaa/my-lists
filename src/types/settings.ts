import type { ListId } from './lists.ts'

export interface PicksToggles {
  enabled: boolean
  movies: boolean
  series: boolean
  games: boolean
}

export interface EnrichReportLine {
  tab: ListId
  posterFilled: number
  posterMissing: number
  imdbFilled: number
  imdbMissing: number
  failures: string[]
}

export interface LastRun {
  startedAt: string
  finishedAt: string
  mode: 'fill' | 'force'
  tab: string
  ok: boolean
  summary: string
  failed: number
  lines: EnrichReportLine[]
}

export interface SettingsData {
  hardOff: boolean
  picks: PicksToggles
  effective: Pick<PicksToggles, 'movies' | 'series' | 'games'>
  lastRun: LastRun | null
}

export interface EnrichProgress {
  running: boolean
  tab: ListId | null
  done: number
  total: number
  failed: number
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  mode: 'fill' | 'force' | null
  target: string | null
  lines: EnrichReportLine[]
  lastRun: LastRun | null
}
