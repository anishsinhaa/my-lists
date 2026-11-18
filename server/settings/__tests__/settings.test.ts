import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import enrich from '../../../api/settings/enrich.js'
import status from '../../../api/settings/enrich/status.js'
import settings from '../../../api/settings.js'
import { resetEnvCache } from '../../config/env.js'
import { signToken } from '../../auth/tokens.js'
import { resetEnrichJob, enrichStatus } from '../enrichJob.js'
import { effectivePicks, readSettings, setSettingsPath, settingsFromRows, skippedPicks, writeSettings } from '../store.js'

const { backfillAll } = vi.hoisted(() => ({ backfillAll: vi.fn() }))

vi.mock('../../images/backfill.js', () => ({
  backfillAll,
  toReportLine: (report: { tab: string; posterFilled: number; posterMissing: number; imdbFilled: number; imdbMissing: number; failures: Array<{ title: string; reason: string }> }) => ({
    tab: report.tab,
    posterFilled: report.posterFilled,
    posterMissing: report.posterMissing,
    imdbFilled: report.imdbFilled,
    imdbMissing: report.imdbMissing,
    failures: report.failures.map((failure) => `${failure.title}: ${failure.reason}`),
  }),
}))

function useEnv(): void {
  process.env.AUTH_USERNAME = 'zeus'
  process.env.AUTH_PASSWORD_HASH = 'hash'
  process.env.JWT_SECRET = 'local-dev-secret-that-is-at-least-32-characters'
  process.env.JWT_EXPIRES_IN = '30d'
  process.env.GOOGLE_SHEET_ID = 'sheet'
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'bot@example.com'
  process.env.GOOGLE_PRIVATE_KEY = 'key'
  process.env.TMDB_READ_TOKEN = 'tmdb'
  process.env.RAWG_API_KEY = 'rawg'
  process.env.OPEN_LIBRARY_CONTACT = 'me@example.com'
  process.env.FEATURE_PICKS = 'true'
  resetEnvCache()
}

function capture(): { res: VercelResponse; status: () => number; body: () => { ok: boolean; data?: Record<string, unknown>; error?: { message: string } } } {
  const state = { statusCode: 200, payload: undefined as { ok: boolean; data?: Record<string, unknown>; error?: { message: string } } | undefined }
  const res = {
    status(code: number) {
      state.statusCode = code
      return this
    },
    json(data: { ok: boolean; data?: Record<string, unknown>; error?: { message: string } }) {
      state.payload = data
    },
    setHeader() {
      return this
    },
  }
  return { res: res as unknown as VercelResponse, status: () => state.statusCode, body: () => state.payload ?? { ok: false } }
}

let dir = ''

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ml-settings-'))
  setSettingsPath(join(dir, 'settings.json'))
  resetEnrichJob()
  backfillAll.mockReset()
  backfillAll.mockResolvedValue([])
  useEnv()
})

afterEach(() => {
  resetEnrichJob()
  rmSync(dir, { recursive: true, force: true })
})

describe('settings routes', () => {
  it('rejects requests without a token', async () => {
    const get = capture()
    await settings({ method: 'GET', headers: {} } as VercelRequest, get.res)
    expect(get.status()).toBe(401)
    const post = capture()
    await enrich({ method: 'POST', headers: {}, body: { tab: 'games', force: false } } as VercelRequest, post.res)
    expect(post.status()).toBe(401)
    const poll = capture()
    await status({ method: 'GET', headers: {} } as VercelRequest, poll.res)
    expect(poll.status()).toBe(401)
  })

  it('saves picks toggles and keeps them off when FEATURE_PICKS is false', async () => {
    const token = await signToken({ id: 'local', username: 'zeus' })
    const auth = { authorization: `Bearer ${token.token}` }
    const saved = capture()
    await settings({ method: 'PUT', headers: auth, body: { enabled: true, movies: true, series: false, games: true } } as unknown as VercelRequest, saved.res)
    expect(saved.status()).toBe(200)
    expect(saved.body().data?.effective).toEqual({ movies: true, series: false, games: true })
    expect(skippedPicks(readSettings().picks, false)).toEqual(['series-picks'])

    process.env.FEATURE_PICKS = 'false'
    resetEnvCache()
    const hidden = capture()
    await settings({ method: 'GET', headers: auth } as VercelRequest, hidden.res)
    expect(hidden.body().data?.hardOff).toBe(true)
    expect(hidden.body().data?.effective).toEqual({ movies: false, series: false, games: false })
    expect(readSettings().picks.series).toBe(false)
    expect(effectivePicks(readSettings().picks, true)).toEqual({ movies: false, series: false, games: false })
  })

  it('runs one refresh at a time and remembers the result', async () => {
    const token = await signToken({ id: 'local', username: 'zeus' })
    const auth = { authorization: `Bearer ${token.token}` }
    let release: (value: unknown[]) => void = () => undefined
    backfillAll.mockImplementation(() => new Promise((resolve) => {
      release = resolve
    }))
    const first = capture()
    await enrich({ method: 'POST', headers: auth, body: { tab: 'games', force: false } } as unknown as VercelRequest, first.res)
    expect(first.status()).toBe(202)
    expect(first.body().data?.running).toBe(true)
    const second = capture()
    await enrich({ method: 'POST', headers: auth, body: { tab: 'games', force: false } } as unknown as VercelRequest, second.res)
    expect(second.status()).toBe(409)
    const forced = capture()
    await enrich({ method: 'POST', headers: auth, body: { tab: 'all', force: true } } as unknown as VercelRequest, forced.res)
    expect(forced.status()).toBe(400)
    release([{ tab: 'games', posterFilled: 1, posterMissing: 6, imdbFilled: 0, imdbMissing: 2, failures: [], omdbSkipped: 0 }])
    await vi.waitFor(() => expect(enrichStatus().running).toBe(false))
    const poll = capture()
    await status({ method: 'GET', headers: auth } as VercelRequest, poll.res)
    expect(poll.body().data?.running).toBe(false)
    const lastRun = poll.body().data?.lastRun as { tab?: string; failed?: number } | null
    expect(lastRun?.tab).toBe('games')
    expect(readSettings().lastRun?.ok).toBe(true)
  })

  it('reads picks from the settings sheet cells and ignores a broken cell', () => {
    expect(settingsFromRows([['picks', '{"enabled":false,"movies":true,"series":true,"games":false}'], ['lastRun', '']]).picks).toEqual({ enabled: false, movies: true, series: true, games: false })
    expect(settingsFromRows([['picks', 'not-json']]).picks.enabled).toBe(true)
    expect(settingsFromRows([]).lastRun).toBeNull()
  })

  it('stores the master toggle without clearing the individual ones', () => {
    writeSettings({ picks: { enabled: false, movies: true, series: false, games: true }, lastRun: null })
    expect(readSettings().picks).toEqual({ enabled: false, movies: true, series: false, games: true })
    expect(effectivePicks(readSettings().picks, false)).toEqual({ movies: false, series: false, games: false })
    expect(skippedPicks(readSettings().picks, false)).toEqual(['movies-picks', 'series-picks', 'games-picks'])
  })
})
