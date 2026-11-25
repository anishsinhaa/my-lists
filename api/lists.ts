import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getEnv } from '../server/config/env.js'
import { loadSettings, skippedPicks } from '../server/settings/store.js'
import { getCachedLists } from '../server/sheets/cache.js'
import { createSheetsClient } from '../server/sheets/client.js'
import { readAll } from '../server/sheets/readAll.js'
import { canEdit } from '../src/types/auth.js'
import { PICKS_IDS } from '../src/types/lists.js'
import type { ListsPayload } from '../src/types/media.js'
import { accountIdForRequest } from '../server/auth/permissions.js'
import { methodGuard, ok } from '../server/http/respond.js'
import { withAuth } from '../server/http/withAuth.js'
import type { RequestContext } from '../server/http/types.js'

async function lists(req: VercelRequest, res: VercelResponse, ctx: RequestContext): Promise<void> {
  if (!methodGuard(req, res, ['GET'])) return
  const refresh = req.query.refresh === '1' && canEdit(ctx.user, accountIdForRequest(ctx))
  const env = getEnv()
  const skipPicks = skippedPicks((await loadSettings()).picks, env.FEATURE_PICKS !== 'true')
  const data = await getCachedLists(() => readAll(createSheetsClient(env), { skipPicks }), { ttlMs: 15_000, force: refresh })
  ok(res, canEdit(ctx.user, accountIdForRequest(ctx)) ? data : stripPicks(data))
}

function stripPicks(data: ListsPayload): ListsPayload {
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  const columns = { ...data.columns }
  for (const id of PICKS_IDS) delete columns[id]
  const warnings = data.warnings.filter((warning) => !(PICKS_IDS as readonly string[]).includes(warning.tab))
  return { ...data, picks, columns, warnings }
}

export default withAuth(lists)
