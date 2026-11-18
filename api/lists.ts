import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getEnv } from '../server/config/env.js'
import { loadSettings, skippedPicks } from '../server/settings/store.js'
import { getCachedLists } from '../server/sheets/cache.js'
import { createSheetsClient } from '../server/sheets/client.js'
import { readAll } from '../server/sheets/readAll.js'
import { methodGuard, ok } from '../server/http/respond.js'
import { withAuth } from '../server/http/withAuth.js'

async function lists(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['GET'])) return
  const refresh = req.query.refresh === '1'
  const env = getEnv()
  const skipPicks = skippedPicks((await loadSettings()).picks, env.FEATURE_PICKS !== 'true')
  const data = await getCachedLists(() => readAll(createSheetsClient(env), { skipPicks }), { ttlMs: 15_000, force: refresh })
  ok(res, data)
}

export default withAuth(lists)
