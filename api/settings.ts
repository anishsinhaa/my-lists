import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getEnv } from '../server/config/env.js'
import { fail, methodGuard, ok } from '../server/http/respond.js'
import { withAuth } from '../server/http/withAuth.js'
import { effectivePicks, readSettings, writeSettings } from '../server/settings/store.js'
import { resetListsCache } from '../server/sheets/cache.js'

const picksSchema = z.object({
  enabled: z.boolean(),
  movies: z.boolean(),
  series: z.boolean(),
  games: z.boolean(),
})

function view() {
  const stored = readSettings()
  const hardOff = getEnv().FEATURE_PICKS !== 'true'
  return { hardOff, picks: stored.picks, effective: effectivePicks(stored.picks, hardOff), lastRun: stored.lastRun }
}

async function settings(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['GET', 'PUT'])) return
  if (req.method === 'GET') {
    ok(res, view())
    return
  }
  const parsed = picksSchema.safeParse(req.body)
  if (!parsed.success) {
    fail(res, 'bad_request', 'Invalid settings', 400)
    return
  }
  const stored = readSettings()
  writeSettings({ picks: parsed.data, lastRun: stored.lastRun })
  resetListsCache()
  ok(res, view())
}

export default withAuth(settings)
