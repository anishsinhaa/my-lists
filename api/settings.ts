import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getEnv } from '../server/config/env.js'
import { canEdit } from '../src/types/auth.js'
import { accountIdForRequest } from '../server/auth/permissions.js'
import { fail, methodGuard, ok } from '../server/http/respond.js'
import { withAuth } from '../server/http/withAuth.js'
import type { RequestContext } from '../server/http/types.js'
import { effectivePicks, loadSettings, saveSettings } from '../server/settings/store.js'
import { resetListsCache } from '../server/sheets/cache.js'

const picksSchema = z.object({
  enabled: z.boolean(),
  movies: z.boolean(),
  series: z.boolean(),
  games: z.boolean(),
})

async function view() {
  const stored = await loadSettings()
  const hardOff = getEnv().FEATURE_PICKS !== 'true'
  return { hardOff, picks: stored.picks, effective: effectivePicks(stored.picks, hardOff), lastRun: stored.lastRun }
}

async function settings(req: VercelRequest, res: VercelResponse, ctx: RequestContext): Promise<void> {
  if (!methodGuard(req, res, ['GET', 'PUT'])) return
  if (req.method === 'GET') {
    ok(res, await view())
    return
  }
  if (!canEdit(ctx.user, accountIdForRequest(ctx))) {
    fail(res, 'forbidden', 'View only. Sign in as the owner to make changes.', 403)
    return
  }
  const parsed = picksSchema.safeParse(req.body)
  if (!parsed.success) {
    fail(res, 'bad_request', 'Invalid settings', 400)
    return
  }
  try {
    const stored = await loadSettings()
    await saveSettings({ picks: parsed.data, lastRun: stored.lastRun })
  } catch {
    fail(res, 'internal', 'Could not save settings', 500)
    return
  }
  resetListsCache()
  ok(res, await view())
}

export default withAuth(settings)
